import {chromium} from "playwright";
import {execSync} from "node:child_process";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {Pool} from "pg";
import {LOCAL_TEST_ADMIN_EMAIL, seedPasswords} from "./require-seed-env.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});
const passwords = seedPasswords();
const BEN = {email: "ben@andcollar.com", password: "BenOnboard-Audit-12"};

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

const pool = new Pool({connectionString: process.env.DATABASE_URL});
await pool.query(`update "user" set onboarding_dismissed_at = null where email = $1`, [BEN.email]);
await pool.end();

const browser = await chromium.launch();
const benCtx = await browser.newContext();
const benPage = await benCtx.newPage();
await login(benCtx, BEN.email, BEN.password);

async function submitBenRequests() {
  const school = new FormData();
  school.set("schoolName", "And Collar Academy");
  await benCtx.request.post(`${base}/api/onboarding/school`, {multipart: school});
  await benCtx.request.post(`${base}/api/onboarding/program`, {
    data: {
      sport: "Soccer",
      level: "Varsity",
      season: "Fall 2026",
      rosterSize: "22",
    },
  });
  const roster = new FormData();
  roster.set("paste", "Name,Number\nAlex,10\nJordan,7");
  await benCtx.request.post(`${base}/api/onboarding/roster`, {multipart: roster});
  await benCtx.request.post(`${base}/api/onboarding/store`, {
    data: {notes: "Home and away kits for fall season", targetDate: "August 2026"},
  });
}

await submitBenRequests();

const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();
await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);

const usersStatus = await adminCtx.request.get(`${base}/users`);
const requestsStatus = await adminCtx.request.get(`${base}/requests`);
if (usersStatus.status() !== 200 || requestsStatus.status() !== 200) {
  throw new Error(`Admin routes not 200: users=${usersStatus.status()} requests=${requestsStatus.status()}`);
}

const pool2 = new Pool({connectionString: process.env.DATABASE_URL});
const benId = (await pool2.query(`select id from "user" where email = $1`, [BEN.email])).rows[0]?.id;
await adminCtx.request.post(`${base}/api/admin/users/${benId}/invite`, {
  data: {sendEmail: true},
});
const pendingReq = await pool2.query(
  `select id from portal_requests where user_id = $1 and status = 'pending' order by created_at limit 1`,
  [benId],
);
const markId = pendingReq.rows[0]?.id;
if (markId) {
  await adminCtx.request.patch(`${base}/api/admin/requests/${markId}`, {
    data: {},
  });
}
await pool2.end();

const shots = [];

await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase2-admin-users-invite-status"));

await adminPage.goto(`${base}/requests`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase2-admin-requests-queue"));

await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
shots.push(await shot(benPage, "phase2-ben-checklist-overview"));

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

writeFileSync(`${out}/phase2-validation-shots.json`, JSON.stringify({shots}, null, 2));
await browser.close();
console.log(JSON.stringify({shots}, null, 2));
