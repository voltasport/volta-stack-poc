import {chromium} from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto("http://localhost:3000/login", {waitUntil: "networkidle"});
await page.fill('input[name="email"]', "admin@test.local");
await page.fill('input[name="password"]', "admin-test-12");
await page.click('button[type="submit"]');
await page.waitForURL("http://localhost:3000/", {timeout: 15000});

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
