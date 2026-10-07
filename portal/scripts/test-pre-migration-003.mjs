import {chromium} from "playwright";
import {execSync} from "node:child_process";
import {readFileSync, writeFileSync} from "node:fs";
import {Pool} from "pg";
import {LOCAL_TEST_ADMIN_EMAIL, seedPasswords} from "./require-seed-env.mjs";
import {onboardingE2eCredentials} from "./onboarding-e2e-helpers.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const passwords = seedPasswords();
const e2eCreds = onboardingE2eCredentials();
const BEN = {email: e2eCreds.benEmail, password: e2eCreds.benPassword};

async function login(ctx, email, password) {
  const res = await ctx.request.post(`${base}/api/auth/sign-in/email`, {data: {email, password}});
  if (!res.ok()) throw new Error(`${email} login ${res.status()} ${await res.text()}`);
}

async function pageSummary(page, path) {
  const res = await page.goto(`${base}${path}`, {waitUntil: "networkidle"});
  const status = res?.status() ?? 0;
  const text = await page.locator("body").innerText();
  const is404 = text.includes("This page could not be found");
  const has500 = status >= 500 || text.includes("Application error");
  const inviteBanner = text.includes("Invite tracking is not enabled");
  const showsChecklist =
    text.includes("Getting started") && text.includes("Create your first program");
  return {
    httpStatus: status,
    is404Page: is404,
    error500: has500,
    inviteMigrationBanner: inviteBanner,
    showsOnboardingChecklist: showsChecklist,
    snippet: text.replace(/\s+/g, " ").slice(0, 220),
  };
}

execSync("npm run db:seed-users", {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});

const pool = new Pool({connectionString: process.env.DATABASE_URL});
await pool.query(`alter table "user" drop column if exists invited_at`);
await pool.query(`alter table "user" drop column if exists last_invite_sent_at`);
await pool.query(`alter table "user" drop column if exists first_login_at`);
await pool.query(`alter table "user" drop column if exists onboarding_dismissed_at`);
await pool.end();

const browser = await chromium.launch();
const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();
await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);

const benCtx = await browser.newContext();
const benPage = await benCtx.newPage();
await login(benCtx, BEN.email, BEN.password);

const report = {
  state: "001+002 only (003 rolled back locally)",
  admin: {
    overview: await pageSummary(adminPage, "/"),
    users: await pageSummary(adminPage, "/users"),
    programs: await pageSummary(adminPage, "/programs"),
  },
  ben: {
    overview: await pageSummary(benPage, "/"),
    programs: await pageSummary(benPage, "/programs"),
  },
};

await browser.close();

execSync("npm run db:migrate", {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});
execSync("npm run db:seed-users", {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});

writeFileSync("/opt/cursor/artifacts/pre-migration-003-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const failures = [];
for (const [who, pages] of Object.entries(report)) {
  if (who === "state") continue;
  for (const [page, summary] of Object.entries(pages)) {
    if (summary.error500) failures.push(`${who}/${page} 500`);
  }
}
if (failures.length) {
  throw new Error(`Pre-migration checks failed: ${failures.join(", ")}`);
}
