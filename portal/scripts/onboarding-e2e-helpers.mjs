import {Pool} from "pg";
import {LOCAL_TEST_ADMIN_EMAIL, requireEnv, seedPasswords} from "./require-seed-env.mjs";

export function assertLocalDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(
      "Refusing to run onboarding E2E: DATABASE_URL must point at local Postgres (localhost / 127.0.0.1).",
    );
  }
}

export function onboardingE2eCredentials() {
  return {
    adminEmail: LOCAL_TEST_ADMIN_EMAIL,
    adminPassword: seedPasswords().admin,
    benEmail: requireEnv("ONBOARDING_E2E_BEN_EMAIL"),
    benName: requireEnv("ONBOARDING_E2E_BEN_NAME"),
    benPassword: requireEnv("ONBOARDING_E2E_BEN_PASSWORD"),
  };
}

/** Full purge for standing clean-start tests (local DB only). */
export async function purgeOnboardingUserByEmail(email) {
  assertLocalDatabaseUrl();
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const existing = await pool.query(`select id from "user" where lower(email) = lower($1)`, [email]);
  const id = existing.rows[0]?.id;
  if (!id) {
    await pool.end();
    return {deleted: false};
  }

  const orphanSlugs = await pool.query(
    `select a.program_slug
     from user_program_assignments a
     where a.user_id = $1
       and not exists (
         select 1 from user_program_assignments b
         where b.program_slug = a.program_slug and b.user_id <> $1
       )`,
    [id],
  );
  for (const row of orphanSlugs.rows) {
    await pool.query(`delete from programs where slug = $1`, [row.program_slug]);
  }

  await pool.query(`delete from user_program_assignments where user_id = $1`, [id]);
  await pool.query(`delete from session where "userId" = $1`, [id]);
  await pool.query(`delete from account where "userId" = $1`, [id]);
  await pool.query(`delete from "user" where id = $1`, [id]);
  await pool.end();
  return {deleted: true, email};
}

export async function loginViaApi(ctx, base, email, password) {
  const res = await ctx.request.post(`${base}/api/auth/sign-in/email`, {data: {email, password}});
  if (!res.ok()) throw new Error(`${email} login ${res.status()} ${await res.text()}`);
}

export async function deleteUserViaAdminApi(adminCtx, base, userId) {
  const res = await adminCtx.request.delete(`${base}/api/admin/users/${userId}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok()) throw new Error(`DELETE user ${userId}: ${res.status()} ${JSON.stringify(body)}`);
  return body;
}

/** Admin UI create + invite + set-password so Ben can sign in (for screenshot scripts). */
export async function onboardBenViaAdminUi(adminPage, adminCtx, benPage, base, creds) {
  await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
  await adminPage.fill('input[name="name"]', creds.benName);
  await adminPage.fill('input[name="email"]', creds.benEmail);
  await adminPage.selectOption('select[name="role"]', "director");
  await adminPage.click('form button[type="submit"]:has-text("Create user")');
  await adminPage.waitForSelector(`text=${creds.benEmail}`, {timeout: 20000});

  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const benId = (
    await pool.query(`select id from "user" where lower(email) = lower($1)`, [creds.benEmail])
  ).rows[0]?.id;
  await pool.end();
  if (!benId) throw new Error("Ben not found after admin create");

  const inviteRes = await adminCtx.request.post(`${base}/api/admin/users/${benId}/invite`, {
    data: {sendEmail: true},
  });
  const inviteJson = await inviteRes.json();
  if (!inviteRes.ok() || !inviteJson.url) {
    throw new Error(inviteJson.error ?? "Invite URL missing");
  }

  await benPage.goto(inviteJson.url, {waitUntil: "networkidle"});
  await benPage.fill('input[type="password"]', creds.benPassword);
  await benPage.click('button[type="submit"]');
  await benPage.waitForURL((url) => !url.pathname.includes("/reset-password"), {timeout: 30000});
}
