import {chromium} from "playwright";
import {mkdirSync} from "node:fs";
import {LOCAL_TEST_ADMIN_EMAIL, seedPasswords} from "./require-seed-env.mjs";

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3000";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const passwords = seedPasswords();
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${base}/login`, {waitUntil: "networkidle"});
await page.screenshot({path: `${out}/after-login-page.png`, fullPage: true});

await page.fill('input[name="email"]', LOCAL_TEST_ADMIN_EMAIL);
await page.fill('input[name="password"]', passwords.admin);
await page.click('button[type="submit"]');
await page.waitForURL(`${base}/`, {timeout: 15000});

await page.setViewportSize({width: 1440, height: 900});
await page.screenshot({path: `${out}/after-overview-desktop.png`, fullPage: true});

await page.getByRole("button", {name: "Collapse sidebar"}).click();
await page.waitForTimeout(400);
await page.screenshot({path: `${out}/after-sidebar-collapsed.png`, fullPage: true});

await page.setViewportSize({width: 390, height: 844});
await page.goto(`${base}/`, {waitUntil: "networkidle"});
await page.click('button[aria-label="Open menu"]');
await page.waitForTimeout(400);
await page.screenshot({path: `${out}/after-mobile-drawer.png`, fullPage: true});

await browser.close();
console.log("done");
