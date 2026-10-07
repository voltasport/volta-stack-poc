import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
import {readFileSync} from "node:fs";
import {Pool} from "pg";
import {LOCAL_TEST_ADMIN_EMAIL, seedPasswords} from "./require-seed-env.mjs";
import {onboardingE2eCredentials, purgeOnboardingUserByEmail} from "./onboarding-e2e-helpers.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const e2eCreds = onboardingE2eCredentials();
const BEN_EMAIL = e2eCreds.benEmail;
const BEN_NAME = e2eCreds.benName;
const BEN_PASSWORD = e2eCreds.benPassword;
const shots = [];

async function shot(page, name, viewport) {
  if (viewport) await page.setViewportSize(viewport);
  const file = `${name}.png`;
  await page.screenshot({path: `${out}/${file}`, fullPage: true});
  shots.push({
    step: name,
    file,
    viewport: viewport ? `${viewport.width}x${viewport.height}` : "current",
  });
}

async function login(context, email, password) {
  const res = await context.request.post(`${base}/api/auth/sign-in/email`, {
    data: {email, password},
  });
  if (!res.ok()) throw new Error(`login ${email}: ${res.status()} ${await res.text()}`);
}

const passwords = seedPasswords();
await purgeOnboardingUserByEmail(BEN_EMAIL);

const browser = await chromium.launch();
const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();

await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);
await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
await shot(adminPage, "01-admin-users-before-add", {width: 1440, height: 900});
await shot(adminPage, "01-admin-users-before-add-mobile", {width: 390, height: 844});

await adminPage.fill('input[name="name"]', BEN_NAME);
await adminPage.fill('input[name="email"]', BEN_EMAIL);
await adminPage.selectOption('select[name="role"]', "director");
await adminPage.click('button[type="submit"]:has-text("Create user")');
await adminPage.waitForSelector(`text=${BEN_EMAIL}`, {timeout: 15000});
await shot(adminPage, "02-admin-after-create-ben", {width: 1440, height: 900});
await shot(adminPage, "02-admin-after-create-ben-mobile", {width: 390, height: 844});

const benRow = adminPage.locator("li", {hasText: BEN_EMAIL});
await benRow.getByRole("button", {name: /Copy set-password link/i}).click();
await adminPage.waitForSelector("text=Invite / reset link", {timeout: 10000});
await shot(adminPage, "03-admin-invite-link-ui", {width: 1440, height: 900});
await shot(adminPage, "03-admin-invite-link-ui-mobile", {width: 390, height: 844});

const linkText = await adminPage.locator(".break-all.rounded-2xl").textContent();
const inviteFromUi = linkText?.trim() ?? "";

const pool = new Pool({connectionString: process.env.DATABASE_URL});
const benIdRow = await pool.query(`select id from "user" where email = $1`, [BEN_EMAIL]);
const benId = benIdRow.rows[0]?.id;
await pool.end();

if (!benId) throw new Error("Ben user not found after create");

const inviteRes = await adminCtx.request.post(`${base}/api/admin/users/${benId}/invite`);
const inviteJson = await inviteRes.json();
const inviteUrl = inviteJson.url ?? inviteFromUi;
writeFileSync(`${out}/ben-invite-url.txt`, inviteUrl ?? "missing");

writeFileSync(
  `${out}/invite-email-not-sent.html`,
  `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Portal invite — not sent automatically</title></head><body style="font-family:system-ui;max-width:560px;margin:40px auto;padding:24px">
<h1>No automated invite email today</h1>
<p><strong>What the product does:</strong> Better Auth <code>sendResetPassword</code> is a no-op. Admins use <strong>Copy set-password link</strong> on the Users page and send the URL manually (email, Slack, etc.).</p>
<p><strong>There is no subject line, sender, or HTML template</strong> in the codebase for client onboarding.</p>
<p><strong>Link that would be shared with Ben:</strong></p>
<p style="word-break:break-all;background:#f4f4f4;padding:12px;border-radius:8px">${inviteUrl ?? "(invite API failed)"}</p>
<p><em>Conceptual email the admin might send:</em></p>
<blockquote style="border-left:3px solid #3dcb7a;padding-left:12px;color:#333">
Subject: You're invited to Volta portal<br/><br/>
Hi Ben — your Volta portal account is ready. Set your password here: [link]. Then sign in to track programs, rosters, and proofs.
</blockquote>
</body></html>`,
);

const emailPage = await browser.newPage();
await emailPage.goto(`file://${out}/invite-email-not-sent.html`, {waitUntil: "load"});
await shot(emailPage, "03b-invite-email-not-sent-doc", {width: 1440, height: 900});
await shot(emailPage, "03b-invite-email-not-sent-doc-mobile", {width: 390, height: 844});

const benCtx = await browser.newContext();
const benPage = await benCtx.newPage();
await benPage.goto(inviteUrl, {waitUntil: "networkidle"});
await shot(benPage, "04-ben-set-password", {width: 1440, height: 900});
await shot(benPage, "04-ben-set-password-mobile", {width: 390, height: 844});
await benPage.fill('input[type="password"]', BEN_PASSWORD);
await benPage.click('button[type="submit"]');
await benPage.waitForURL((url) => !url.pathname.includes("/reset-password"), {timeout: 25000});
await benPage.waitForTimeout(800);
await shot(benPage, "05-ben-after-set-password-landing", {width: 1440, height: 900});
await shot(benPage, "05-ben-after-set-password-landing-mobile", {width: 390, height: 844});

await benPage.goto(`${base}/login`, {waitUntil: "networkidle"});
await benPage.fill('input[name="email"]', BEN_EMAIL);
await benPage.fill('input[name="password"]', BEN_PASSWORD);
await benPage.click('button[type="submit"]');
await benPage.waitForURL((url) => !url.pathname.includes("/login"), {timeout: 20000});
await benPage.waitForTimeout(600);
await shot(benPage, "05c-ben-first-login-overview", {width: 1440, height: 900});
await shot(benPage, "05c-ben-first-login-overview-mobile", {width: 390, height: 844});

for (const [path, name] of [
  ["/programs", "07-ben-programs"],
  ["/programs?tab=roster", "08-ben-rosters"],
  ["/store", "09-ben-team-stores"],
  ["/approvals/away-kit", "10-ben-approvals"],
  ["/invoices", "11-ben-invoices"],
]) {
  const res = await benCtx.request.get(`${base}${path}`);
  const status = res.status();
  await benPage.goto(`${base}${path}`, {waitUntil: "networkidle"});
  await benPage.waitForTimeout(500);
  await shot(benPage, `${name}-http${status}`, {width: 1440, height: 900});
  await shot(benPage, `${name}-http${status}-mobile`, {width: 390, height: 844});
}

await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
try {
  const schoolSelect = benPage.locator('select[aria-label="School"]');
  await schoolSelect.click({timeout: 5000});
  await benPage.waitForTimeout(200);
  await shot(benPage, "12-ben-school-picker-open", {width: 1440, height: 900});
  await shot(benPage, "12-ben-school-picker-open-mobile", {width: 390, height: 844});
} catch {
  await shot(benPage, "12-ben-school-picker-missing-or-broken", {width: 1440, height: 900});
  await shot(benPage, "12-ben-school-picker-missing-or-broken-mobile", {width: 390, height: 844});
}

writeFileSync(`${out}/onboarding-audit-shots.json`, JSON.stringify({shots, inviteUrl}, null, 2));
await browser.close();
console.log(JSON.stringify({shots: shots.length, inviteUrl}, null, 2));
