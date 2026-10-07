import {chromium} from "playwright";
import {mkdirSync, readdirSync, readFileSync, writeFileSync} from "node:fs";
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
  if (!res.ok()) throw new Error(`${email} login ${res.status()}`);
}

async function shot(page, name, mobile = false) {
  await page.setViewportSize(mobile ? {width: 390, height: 844} : {width: 1440, height: 900});
  const file = `${name}.png`;
  await page.screenshot({path: `${out}/${file}`, fullPage: true});
  return file;
}

const pool = new Pool({connectionString: process.env.DATABASE_URL});
await pool.query(`update "user" set onboarding_dismissed_at = null where email = $1`, [BEN.email]);
const benRow = await pool.query(`select id from "user" where email = $1`, [BEN.email]);
const benId = benRow.rows[0]?.id;
await pool.end();

const browser = await chromium.launch();
const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();
await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);

if (benId) {
  await adminCtx.request.post(`${base}/api/admin/users/${benId}/invite`, {
    data: {sendEmail: true},
  });
}

const shots = [];
await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase2-admin-users-invite-status"));

const previewDir = join(process.cwd(), ".data", "email-previews");
try {
  const previews = readdirSync(previewDir).filter((f) => f.endsWith(".html")).sort();
  const latest = previews.at(-1);
  if (latest) {
    const emailPage = await browser.newPage();
    await emailPage.goto(`file://${join(previewDir, latest)}`, {waitUntil: "load"});
    shots.push(await shot(emailPage, "phase2-invite-email-rendered"));
  }
} catch {
  /* no previews yet */
}

const benCtx = await browser.newContext();
const benPage = await benCtx.newPage();
await login(benCtx, BEN.email, BEN.password);
await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
shots.push(await shot(benPage, "phase2-ben-checklist-overview"));
shots.push(await shot(benPage, "phase2-ben-checklist-overview-mobile", true));

await benPage.getByRole("button", {name: /Request your first program/i}).click();
await benPage.waitForTimeout(300);
shots.push(await shot(benPage, "phase2-ben-program-request-form"));

await benPage.getByRole("button", {name: /Add your school/i}).click();
await benPage.fill('input[name="schoolName"]', "And Collar Academy");
shots.push(await shot(benPage, "phase2-ben-school-request-form"));

await benPage.getByRole("button", {name: /Upload a roster/i}).click();
shots.push(await shot(benPage, "phase2-ben-roster-request-form"));

await benPage.getByRole("button", {name: /Request your team store/i}).click();
shots.push(await shot(benPage, "phase2-ben-store-request-form"));

await adminPage.goto(`${base}/requests`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase2-admin-requests-queue"));

writeFileSync(`${out}/phase2-validation-shots.json`, JSON.stringify({shots}, null, 2));
await browser.close();
console.log(JSON.stringify({shots: shots.length, list: shots}, null, 2));
