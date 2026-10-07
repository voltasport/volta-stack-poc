import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
import {
  LOCAL_TEST_ADMIN_EMAIL,
  LOCAL_TEST_DIRECTOR_EMAIL,
  LOCAL_TEST_MANAGER_EMAIL,
  inviteTestPassword,
  randomProbePassword,
  seedPasswords,
} from "./require-seed-env.mjs";

/** Use the same origin as `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` on the prod server. */
const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const report = {checks: [], screenshots: []};

function pass(name, detail) {
  report.checks.push({name, ok: true, detail});
}
function fail(name, detail) {
  report.checks.push({name, ok: false, detail});
  throw new Error(`${name}: ${detail}`);
}

async function login(context, page, email, password) {
  const res = await context.request.post(`${base}/api/auth/sign-in/email`, {
    data: {email, password},
  });
  if (!res.ok()) {
    throw new Error(`API login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  await page.goto(`${base}/`, {waitUntil: "networkidle"});
  const body = await page.locator("body").innerText();
  if (/Sign in|Could not sign in/.test(body) && !/MORNING|PROGRAMS|USERS|NO PROGRAMS/.test(body)) {
    throw new Error(`Session not established for ${email}: ${body.slice(0, 160)}`);
  }
}

async function shot(page, file) {
  const path = `${out}/${file}.png`;
  await page.screenshot({path, fullPage: true});
  report.screenshots.push(file);
}

const passwords = seedPasswords();
const browser = await chromium.launch();

const signUpRes = await fetch(`${base}/api/auth/sign-up/email`, {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    email: "blocked-signup@test.local",
    password: randomProbePassword(),
    name: "Blocked",
  }),
});
if (signUpRes.status === 200) fail("sign-up-rejected", `expected non-200, got ${signUpRes.status}`);
else pass("sign-up-rejected", `HTTP ${signUpRes.status}`);

const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();
await login(adminCtx, adminPage, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);
await adminPage.waitForSelector("h1:has-text('MORNING')", {timeout: 20000});
await adminPage.setViewportSize({width: 1440, height: 900});
await shot(adminPage, "role-admin-overview-desktop");
await adminPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
await adminPage.waitForSelector("h1:has-text('PROGRAMS')", {timeout: 15000});
await shot(adminPage, "role-admin-programs-desktop");
await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
await adminPage.waitForSelector("h1:has-text('USERS')", {timeout: 15000});
await shot(adminPage, "role-admin-users-desktop");
await adminPage.setViewportSize({width: 390, height: 844});
await adminPage.goto(`${base}/`, {waitUntil: "networkidle"});
await adminPage.waitForSelector("h1:has-text('MORNING')", {timeout: 15000});
await shot(adminPage, "role-admin-overview-mobile");
await adminPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
await shot(adminPage, "role-admin-programs-mobile");
await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
await shot(adminPage, "role-admin-users-mobile");
pass("admin-screenshots", "overview, programs, users captured");

const inviteEmail = `invited-${Date.now()}@test.local`;
const invitePassword = inviteTestPassword();
const createRes = await adminCtx.request.post(`${base}/api/admin/users`, {
  data: {email: inviteEmail, name: "Invited Manager", role: "manager"},
});
const createJson = await createRes.json();
if (!createRes.ok()) fail("invite-create-user", JSON.stringify(createJson));
const userId = createJson.user?.id;
if (!userId) fail("invite-create-user", "missing user id");

await adminCtx.request.patch(`${base}/api/admin/users/${userId}`, {
  data: {programSlugs: ["mens-soccer"]},
});

const inviteRes = await adminCtx.request.post(`${base}/api/admin/users/${userId}/invite`);
const inviteJson = await inviteRes.json();
if (!inviteRes.ok() || !inviteJson.url) fail("invite-link", JSON.stringify(inviteJson));
pass("invite-link", inviteJson.url.slice(0, 60) + "…");

const inviteCtx = await browser.newContext();
const invitePage = await inviteCtx.newPage();
await invitePage.goto(inviteJson.url, {waitUntil: "networkidle"});
await invitePage.fill('input[type="password"]', invitePassword);
await invitePage.click('button[type="submit"]');
await invitePage.waitForFunction(
  () => !window.location.pathname.includes("/reset-password"),
  undefined,
  {timeout: 25000},
);
await login(inviteCtx, invitePage, inviteEmail, invitePassword);
await invitePage.waitForSelector("h1:has-text('MORNING')", {timeout: 20000});
await invitePage.goto(`${base}/programs`, {waitUntil: "networkidle"});
const programText = await invitePage.locator("body").innerText();
if (!programText.includes("Men’s Soccer") && !programText.includes("Men's Soccer")) {
  fail("invite-program-visible", "expected Men’s Soccer in programs list");
}
if (programText.includes("Cross Country")) {
  fail("invite-program-scoped", "Cross Country should not be visible");
}
const blocked = await inviteCtx.request.get(`${base}/programs/davis-varsity`);
if (blocked.status() !== 404) fail("invite-url-404", `expected 404, got ${blocked.status()}`);
pass("invite-flow", "set password, login, single program, 404 on other");

const directorCtx = await browser.newContext();
const directorPage = await directorCtx.newPage();
await login(directorCtx, directorPage, LOCAL_TEST_DIRECTOR_EMAIL, passwords.director);
await directorPage.waitForSelector("h1:has-text('MORNING')", {timeout: 20000});
await directorPage.setViewportSize({width: 1440, height: 900});
await shot(directorPage, "role-director-overview-desktop");
await directorPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
await directorPage.waitForSelector("h1:has-text('PROGRAMS')", {timeout: 15000});
await shot(directorPage, "role-director-programs-desktop");
const dBlocked = await directorCtx.request.get(`${base}/programs/davis-varsity`);
if (dBlocked.status() !== 404) fail("director-cross-team", `expected 404, got ${dBlocked.status()}`);
pass("director-cross-team", "HTTP 404");
await directorPage.setViewportSize({width: 390, height: 844});
await directorPage.goto(`${base}/`, {waitUntil: "networkidle"});
await shot(directorPage, "role-director-overview-mobile");
await directorPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
await shot(directorPage, "role-director-programs-mobile");

const managerCtx = await browser.newContext();
const managerPage = await managerCtx.newPage();
await login(managerCtx, managerPage, LOCAL_TEST_MANAGER_EMAIL, passwords.manager);
await managerPage.waitForSelector("h1:has-text('MORNING')", {timeout: 20000});
await managerPage.setViewportSize({width: 1440, height: 900});
await shot(managerPage, "role-manager-overview-desktop");
await managerPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
await shot(managerPage, "role-manager-programs-desktop");
const mBody = await managerPage.locator("body").innerText();
if (!mBody.includes("Varsity Basketball")) fail("manager-single-program", "Varsity Basketball not found");
await managerPage.setViewportSize({width: 390, height: 844});
await managerPage.goto(`${base}/`, {waitUntil: "networkidle"});
await shot(managerPage, "role-manager-overview-mobile");
await managerPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
await shot(managerPage, "role-manager-programs-mobile");
pass("manager-screenshots", "captured");

await browser.close();
writeFileSync(`${out}/validation-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
