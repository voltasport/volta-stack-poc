import {chromium} from "playwright";
import {execSync} from "node:child_process";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {Pool} from "pg";
import {LOCAL_TEST_ADMIN_EMAIL, seedPasswords} from "./require-seed-env.mjs";
import {
  assertLocalDatabaseUrl,
  loginViaApi,
  onboardBenViaAdminUi,
  onboardingE2eCredentials,
  purgeOnboardingUserByEmail,
} from "./onboarding-e2e-helpers.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});
const passwords = seedPasswords();
assertLocalDatabaseUrl();
const e2eCreds = onboardingE2eCredentials();
const BEN = {email: e2eCreds.benEmail, password: e2eCreds.benPassword};

async function login(ctx, email, password) {
  const res = await ctx.request.post(`${base}/api/auth/sign-in/email`, {data: {email, password}});
  if (!res.ok()) throw new Error(`${email} login ${res.status()} ${await res.text()}`);
}

async function shot(page, name, mobile = false) {
  await page.setViewportSize(mobile ? {width: 390, height: 844} : {width: 1440, height: 900});
  const file = `${name}.png`;
  await page.screenshot({path: `${out}/${file}`, fullPage: true});
  return file;
}

execSync("npm run db:seed-users", {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});

await purgeOnboardingUserByEmail(BEN.email);

const browser = await chromium.launch();
const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();
await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);

const benCtx = await browser.newContext();
const benPage = await benCtx.newPage();
await onboardBenViaAdminUi(adminPage, adminCtx, benPage, base, e2eCreds);

const usersStatus = await adminCtx.request.get(`${base}/users`);
if (usersStatus.status() !== 200) {
  throw new Error(`Admin users not 200: ${usersStatus.status()}`);
}

const pool3 = new Pool({connectionString: process.env.DATABASE_URL});
const invitedProbe = await pool3.query(
  `select id from "user" where email like 'invited-%@test.local' and first_login_at is null order by email limit 1`,
);
const invitedId = invitedProbe.rows[0]?.id;
await pool3.end();
if (invitedId) {
  await adminCtx.request.post(`${base}/api/admin/users/${invitedId}/invite`, {data: {sendEmail: false}});
}

const shots = [];

await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase2-admin-users-invite-status"));

await adminPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase2-admin-programs-new-button"));

await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
shots.push(await shot(benPage, "phase2-ben-checklist-overview"));
shots.push(await shot(benPage, "phase2-ben-checklist-mobile", true));

await benCtx.request.post(`${base}/api/programs`, {
  data: {
    organizationName: "And Collar",
    name: "And Collar Academy Soccer",
    sport: "Soccer",
    levelOrSeason: "Varsity · Fall 2026",
    rosterSize: 22,
  },
});

const pool2 = new Pool({connectionString: process.env.DATABASE_URL});
const benSlug = (
  await pool2.query(
    `select program_slug from user_program_assignments a
     join "user" u on u.id = a.user_id where u.email = $1 order by a.created_at desc limit 1`,
    [BEN.email],
  )
).rows[0]?.program_slug;

if (benSlug) {
  await benCtx.request.post(`${base}/api/programs/${benSlug}/roster`, {
    data: {paste: "Name,Number\nAlex,10\nJordan,7", mode: "append"},
  });
}
await pool2.end();

if (benSlug) {
  await benPage.goto(`${base}/programs/${benSlug}?tab=roster`, {waitUntil: "networkidle"});
  shots.push(await shot(benPage, "phase2-ben-roster-editor", false));
  await benPage.setViewportSize({width: 1024, height: 768});
  shots.push(await shot(benPage, "phase2-ben-roster-1024", false));
  await benPage.setViewportSize({width: 1280, height: 800});
  shots.push(await shot(benPage, "phase2-ben-roster-1280", false));
  await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
  shots.push(await shot(benPage, "phase2-ben-picker-after-program", false));
  shots.push(await shot(benPage, "phase2-ben-picker-mobile", true));
}

const previewDir = join(process.cwd(), ".data", "email-previews");
try {
  const {readdirSync} = await import("node:fs");
  const latest = readdirSync(previewDir).filter((f) => f.endsWith(".html")).sort().at(-1);
  if (latest) {
    const emailPage = await browser.newPage();
    await emailPage.goto(`file://${join(previewDir, latest)}`, {waitUntil: "load"});
    shots.push(await shot(emailPage, "phase2-invite-email-rendered"));
    await emailPage.close();
  }
} catch {
  /* optional dev preview */
}

writeFileSync(`${out}/phase2-validation-shots.json`, JSON.stringify({shots, benSlug}, null, 2));
await browser.close();
console.log(JSON.stringify({shots}, null, 2));
