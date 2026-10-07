import {chromium} from "playwright";
import {mkdirSync} from "node:fs";
import {
  LOCAL_TEST_ADMIN_EMAIL,
  LOCAL_TEST_DIRECTOR_EMAIL,
  LOCAL_TEST_MANAGER_EMAIL,
  seedPasswords,
} from "./require-seed-env.mjs";

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const passwords = seedPasswords();

async function login(context, email, password) {
  const res = await context.request.post(`${base}/api/auth/sign-in/email`, {
    data: {email, password},
  });
  if (!res.ok()) throw new Error(`login ${email}: ${res.status()}`);
}

async function setEntity(context, slug) {
  await context.addCookies([
    {
      name: "volta_entity",
      value: encodeURIComponent(slug),
      domain: "localhost",
      path: "/",
    },
  ]);
}

const browser = await chromium.launch();

const adminCtx = await browser.newContext({viewport: {width: 1440, height: 900}});
await login(adminCtx, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);
await setEntity(adminCtx, "davis");
await adminCtx.newPage().then(async (page) => {
  await page.goto(`${base}/users`, {waitUntil: "networkidle"});
  await page.screenshot({path: `${out}/after-nav-badges-davis-admin.png`, fullPage: true});
});
await adminCtx.newPage().then(async (page) => {
  await page.goto(`${base}/store`, {waitUntil: "networkidle"});
  await page.screenshot({path: `${out}/after-store-no-cart.png`, fullPage: true});
});
await adminCtx.newPage().then(async (page) => {
  await page.goto(`${base}/`, {waitUntil: "networkidle"});
  await page.getByRole("button", {name: "Collapse sidebar"}).click();
  await page.waitForTimeout(300);
  await page.screenshot({path: `${out}/after-team-store-icon-collapsed.png`, fullPage: true});
});
await adminCtx.newPage().then(async (page) => {
  await page.goto(`${base}/programs/womens-soccer?tab=roster`, {waitUntil: "networkidle"});
  await page.waitForTimeout(400);
  await page.screenshot({path: `${out}/after-roster-tab-sidebar.png`, fullPage: true});
  await page.getByRole("button", {name: "Items"}).click();
  await page.waitForTimeout(400);
  await page.screenshot({path: `${out}/after-roster-tab-items-click-sidebar.png`, fullPage: true});
});

const directorCtx = await browser.newContext({viewport: {width: 1440, height: 900}});
await login(directorCtx, LOCAL_TEST_DIRECTOR_EMAIL, passwords.director);
await directorCtx.newPage().then(async (page) => {
  await page.goto(`${base}/programs/cross-country?tab=roster`, {waitUntil: "networkidle"});
  await page.screenshot({path: `${out}/after-director-roster-sidebar.png`, fullPage: true});
});

const managerCtx = await browser.newContext({viewport: {width: 1440, height: 900}});
await login(managerCtx, LOCAL_TEST_MANAGER_EMAIL, passwords.manager);
await managerCtx.newPage().then(async (page) => {
  await page.goto(`${base}/programs/davis-varsity?tab=roster`, {waitUntil: "networkidle"});
  await page.screenshot({path: `${out}/after-manager-roster-sidebar.png`, fullPage: true});
});

await browser.close();
console.log("portal-steven-batch-screenshots done");
