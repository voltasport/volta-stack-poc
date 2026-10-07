import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";

const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const browser = await chromium.launch();
const results = [];

async function login(page, email, password) {
  await page.goto("http://localhost:3000/login", {waitUntil: "networkidle"});
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("http://localhost:3000/**", {timeout: 15000});
}

async function shot(page, name) {
  await page.screenshot({path: `${out}/${name}.png`, fullPage: true});
  results.push(name);
}

const signUp = await fetch("http://localhost:3000/api/auth/sign-up/email", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({email: "blocked@test.local", password: "blocked-test-12", name: "Blocked"}),
});
console.log("signUpStatus", signUp.status);

const page = await browser.newPage();

await login(page, "admin@voltasport.co", "VoltaAdmin123!");
await page.setViewportSize({width: 1440, height: 900});
await shot(page, "role-admin-desktop");
await page.setViewportSize({width: 390, height: 844});
await shot(page, "role-admin-mobile");
await page.goto("http://localhost:3000/users", {waitUntil: "networkidle"});
await shot(page, "role-admin-users-mobile");

await page.context().clearCookies();
await login(page, "director@test.local", "director-test-12");
await page.setViewportSize({width: 1440, height: 900});
await shot(page, "role-director-desktop");
await page.setViewportSize({width: 390, height: 844});
await shot(page, "role-director-mobile");
const blocked = await page.goto("http://localhost:3000/programs/davis-varsity", {
  waitUntil: "networkidle",
});
console.log("directorCrossTeamStatus", blocked?.status() ?? "unknown");

await page.context().clearCookies();
await login(page, "manager@test.local", "manager-test-12");
await page.setViewportSize({width: 1440, height: 900});
await shot(page, "role-manager-desktop");
await page.setViewportSize({width: 390, height: 844});
await shot(page, "role-manager-mobile");

await browser.close();
console.log(JSON.stringify({results, signUpStatus: signUp.status}));
