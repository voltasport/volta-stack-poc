import {chromium} from "playwright";
import {mkdirSync} from "node:fs";

const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://voltasport.vercel.app/login", {waitUntil: "networkidle"});
await page.screenshot({path: `${out}/before-production-login.png`, fullPage: true});
await browser.close();
