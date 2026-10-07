import {chromium} from "playwright";
import {mkdirSync} from "node:fs";

const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:3000/login", {waitUntil: "networkidle"});
await page.screenshot({path: `${out}/after-login-page.png`, fullPage: true});

await page.fill('input[name="email"]', "admin@test.local");
await page.fill('input[name="password"]', "admin-test-12");
await page.click('button[type="submit"]');
await page.waitForURL("http://localhost:3000/", {timeout: 15000});

await page.setViewportSize({width: 1440, height: 900});
await page.screenshot({path: `${out}/after-overview-desktop.png`, fullPage: true});

await page.getByRole("button", {name: "Collapse sidebar"}).click();
await page.waitForTimeout(400);
await page.screenshot({path: `${out}/after-sidebar-collapsed.png`, fullPage: true});

await page.setViewportSize({width: 390, height: 844});
await page.goto("http://localhost:3000/", {waitUntil: "networkidle"});
await page.click('button[aria-label="Open menu"]');
await page.waitForTimeout(400);
await page.screenshot({path: `${out}/after-mobile-drawer.png`, fullPage: true});

await browser.close();
console.log("done");
