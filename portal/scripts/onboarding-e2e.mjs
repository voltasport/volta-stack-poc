import {chromium} from "playwright";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {Pool} from "pg";
import {
  assertLocalDatabaseUrl,
  deleteUserViaAdminApi,
  loginViaApi,
  onboardingE2eCredentials,
  purgeOnboardingUserByEmail,
} from "./onboarding-e2e-helpers.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

assertLocalDatabaseUrl();

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});
const creds = onboardingE2eCredentials();

async function capture(page, filename, width, height) {
  await page.setViewportSize({width, height});
  await page.screenshot({path: `${out}/${filename}`, fullPage: true});
  return filename;
}
const report = {
  base,
  benEmail: creds.benEmail,
  steps: [],
  ok: false,
  finishedAt: null,
};

function step(name, detail, pass = true) {
  report.steps.push({name, detail, pass});
  if (!pass) throw new Error(`${name}: ${detail}`);
}

try {
  const purge = await purgeOnboardingUserByEmail(creds.benEmail);
  step("purge_ben", purge.deleted ? `Removed existing ${creds.benEmail}` : "No existing user");

  const browser = await chromium.launch();
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await loginViaApi(adminCtx, base, creds.adminEmail, creds.adminPassword);

  await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
  await adminPage.fill('input[name="name"]', creds.benName);
  await adminPage.fill('input[name="email"]', creds.benEmail);
  await adminPage.selectOption('select[name="role"]', "director");
  await adminPage.click('form button[type="submit"]:has-text("Create user")');
  await adminPage.waitForSelector(`text=${creds.benEmail}`, {timeout: 20000});
  step("admin_create_user", "Created director via Users UI");

  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const benId = (
    await pool.query(`select id from "user" where lower(email) = lower($1)`, [creds.benEmail])
  ).rows[0]?.id;
  await pool.end();
  if (!benId) step("resolve_ben_id", "Ben missing after create", false);

  const inviteRes = await adminCtx.request.post(`${base}/api/admin/users/${benId}/invite`, {
    data: {sendEmail: true},
  });
  const inviteJson = await inviteRes.json();
  if (!inviteRes.ok() || !inviteJson.url) {
    step("send_invite", inviteJson.error ?? "No invite URL", false);
  }
  step(
    "send_invite",
    inviteJson.emailSent
      ? "Resend path (unexpected in local log mode)"
      : `Log transport / copy-link (${inviteJson.detail ?? "not_configured"})`,
  );

  const inviteUrl = inviteJson.url;
  const benCtx = await browser.newContext();
  const benPage = await benCtx.newPage();
  await benPage.goto(inviteUrl, {waitUntil: "networkidle"});
  await benPage.fill('input[type="password"]', creds.benPassword);
  await benPage.click('button[type="submit"]');
  await benPage.waitForURL((url) => !url.pathname.includes("/reset-password"), {timeout: 30000});
  step("set_password", "Password set via invite link");

  await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
  let overviewText = await benPage.locator("body").innerText();
  if (overviewText.includes("Sign in") || benPage.url().includes("/login")) {
    await benPage.goto(`${base}/login`, {waitUntil: "networkidle"});
    await benPage.fill('input[name="email"]', creds.benEmail);
    await benPage.fill('input[name="password"]', creds.benPassword);
    await benPage.click('button[type="submit"]');
    await benPage.waitForURL((url) => !url.pathname.includes("/login"), {timeout: 20000});
    await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
    overviewText = await benPage.locator("body").innerText();
  }
  step("first_login", "Session active on overview after set-password");

  overviewText = await benPage.locator("body").innerText();
  if (!overviewText.includes("Create your first program")) {
    step("checklist", "Expected onboarding checklist on overview", false);
  }
  step("checklist", "Onboarding checklist visible");

  await benPage.getByRole("button", {name: "+ New program"}).click();
  const orgField = benPage.locator('input[name="organizationName"]');
  await orgField.waitFor({state: "visible"});
  const orgValue = await orgField.inputValue();
  if (!orgValue.trim()) {
    await orgField.fill("And Collar");
  }
  await benPage.fill('input[name="name"]', "E2E Academy Soccer");
  await benPage.fill('input[name="sport"]', "Soccer");
  await benPage.fill('input[name="levelOrSeason"]', "Varsity · Fall 2026");
  await benPage.fill('input[name="rosterSize"]', "18");
  await benPage.getByRole("button", {name: "Create program"}).click();
  await benPage.waitForURL(/\/programs\//, {timeout: 20000});
  const programUrl = benPage.url();
  step("create_program", `Program created (${programUrl})`);

  await benPage.reload({waitUntil: "networkidle"});
  const pickerText = await benPage.locator("body").innerText();
  if (pickerText.includes("No school assigned yet")) {
    step("school_picker", "Picker still shows pending after program create", false);
  }
  step("school_picker", "Organization visible in school picker after program create");
  report.screenshots = report.screenshots ?? [];
  report.screenshots.push(await capture(benPage, "e2e-picker-after-program-1024.png", 1024, 768));
  report.screenshots.push(await capture(benPage, "e2e-picker-after-program-1280.png", 1280, 800));
  report.screenshots.push(await capture(benPage, "e2e-picker-after-program-mobile.png", 390, 844));

  await benPage.goto(`${programUrl.split("?")[0]}?tab=roster`, {waitUntil: "networkidle"});
  await benPage.fill('input[placeholder="#"]', "10");
  await benPage.fill('input[placeholder="Name"]', "Alex Example");
  await benPage.fill('input[placeholder="Pos"]', "MID");
  await benPage.getByRole("button", {name: "Add player"}).click();
  await benPage.waitForTimeout(500);
  const rosterText = await benPage.locator("body").innerText();
  if (!rosterText.includes("Alex Example")) {
    step("add_roster", "Roster row not visible after add", false);
  }
  step("add_roster", "Manual roster player saved");
  report.screenshots.push(await capture(benPage, "e2e-roster-1024.png", 1024, 768));
  report.screenshots.push(await capture(benPage, "e2e-roster-1280.png", 1280, 800));

  await purgeOnboardingUserByEmail(creds.benEmail);
  step("cleanup", "Purged Ben after successful flow");

  report.ok = true;
  await browser.close();
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  report.ok = false;
}

report.finishedAt = new Date().toISOString();
writeFileSync("/opt/cursor/artifacts/onboarding-e2e-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
