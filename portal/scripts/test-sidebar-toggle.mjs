import {chromium} from "playwright";
import {LOCAL_TEST_ADMIN_EMAIL, seedPasswords} from "./require-seed-env.mjs";

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3000";
const passwords = seedPasswords();

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto(`${base}/login`, {waitUntil: "networkidle"});
await page.fill('input[name="email"]', LOCAL_TEST_ADMIN_EMAIL);
await page.fill('input[name="password"]', passwords.admin);
await page.click('button[type="submit"]');
await page.waitForURL(`${base}/`, {timeout: 15000});

await page.getByRole("button", {name: "Collapse sidebar"}).click();
await page.waitForTimeout(300);
const collapsed = await page.getByRole("button", {name: "Expand sidebar"}).isVisible();
if (!collapsed) throw new Error("Expand control not visible after collapse");

await page.getByRole("button", {name: "Expand sidebar"}).click();
await page.waitForTimeout(300);
const stillIn = await page.getByRole("heading", {name: /MORNING/i}).isVisible();
if (!stillIn) throw new Error("Logged out after expand");

await browser.close();
console.log("sidebar toggle ok");
