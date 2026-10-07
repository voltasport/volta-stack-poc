import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
import {readFileSync} from "node:fs";
import {LOCAL_TEST_ADMIN_EMAIL, LOCAL_TEST_DIRECTOR_EMAIL, LOCAL_TEST_MANAGER_EMAIL, seedPasswords} from "./require-seed-env.mjs";
import {onboardingE2eCredentials} from "./onboarding-e2e-helpers.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});
const passwords = seedPasswords();
const e2eCreds = onboardingE2eCredentials();
const BEN = {email: e2eCreds.benEmail, password: e2eCreds.benPassword};

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

const browser = await chromium.launch();
const shots = [];

const adminCtx = await browser.newContext();
const adminPage = await adminCtx.newPage();
await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);
await adminPage.goto(`${base}/`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase1-after-admin-overview"));

const directorCtx = await browser.newContext();
const directorPage = await directorCtx.newPage();
await login(directorCtx, LOCAL_TEST_DIRECTOR_EMAIL, passwords.director);
await directorPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
shots.push(await shot(directorPage, "phase1-after-director-programs"));

const managerCtx = await browser.newContext();
const managerPage = await managerCtx.newPage();
await login(managerCtx, LOCAL_TEST_MANAGER_EMAIL, passwords.manager);
await managerPage.goto(`${base}/`, {waitUntil: "networkidle"});
shots.push(await shot(managerPage, "phase1-after-manager-overview"));

const benCtx = await browser.newContext();
const benPage = await benCtx.newPage();
await login(benCtx, BEN.email, BEN.password);
await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
shots.push(await shot(benPage, "phase1-after-ben-unassigned-overview"));
shots.push(await shot(benPage, "phase1-after-ben-unassigned-overview-mobile", true));
await benPage.goto(`${base}/programs`, {waitUntil: "networkidle"});
shots.push(await shot(benPage, "phase1-after-ben-unassigned-programs"));
await benPage.goto(`${base}/store`, {waitUntil: "networkidle"});
shots.push(await shot(benPage, "phase1-after-ben-unassigned-store"));

await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
shots.push(await shot(adminPage, "phase1-after-admin-users-no-temp-password"));

writeFileSync(`${out}/phase1-validation-shots.json`, JSON.stringify({shots}, null, 2));
await browser.close();
for (const p of ["/", "/programs", "/store", "/invoices"]) {
  const ctx = await chromium.launch().then((b) => b.newContext());
  await login(ctx, BEN.email, BEN.password);
  const code = (await ctx.request.get(`${base}${p}`)).status();
  await ctx.close();
  console.log("ben", p, code);
}
console.log(JSON.stringify({shots}, null, 2));
