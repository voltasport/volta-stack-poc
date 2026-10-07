import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
import {
  LOCAL_TEST_ADMIN_EMAIL,
  LOCAL_TEST_DIRECTOR_EMAIL,
  LOCAL_TEST_MANAGER_EMAIL,
  randomProbePassword,
  seedPasswords,
} from "./require-seed-env.mjs";

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3000";
const out = "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});

const passwords = seedPasswords();
const browser = await chromium.launch();
const results = [];

async function login(page, email, password) {
  await page.goto(`${base}/login`, {waitUntil: "networkidle"});
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${base}/**`, {timeout: 15000});
}

async function shot(page, name) {
  await page.screenshot({path: `${out}/${name}.png`, fullPage: true});
  results.push(name);
}

const signUp = await fetch(`${base}/api/auth/sign-up/email`, {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    email: "blocked@test.local",
    password: randomProbePassword(),
    name: "Blocked",
  }),
});
console.log("signUpStatus", signUp.status);

const page = await browser.newPage();

await login(page, LOCAL_TEST_ADMIN_EMAIL, passwords.admin);
await page.setViewportSize({width: 1440, height: 900});
await shot(page, "role-admin-desktop");
await page.setViewportSize({width: 390, height: 844});
await shot(page, "role-admin-mobile");
await page.goto(`${base}/users`, {waitUntil: "networkidle"});
await shot(page, "role-admin-users-mobile");

await page.context().clearCookies();
await login(page, LOCAL_TEST_DIRECTOR_EMAIL, passwords.director);
await page.setViewportSize({width: 1440, height: 900});
await shot(page, "role-director-desktop");
await page.setViewportSize({width: 390, height: 844});
await shot(page, "role-director-mobile");
const blocked = await page.goto(`${base}/programs/davis-varsity`, {
  waitUntil: "networkidle",
});
console.log("directorCrossTeamStatus", blocked?.status() ?? "unknown");

await page.context().clearCookies();
await login(page, LOCAL_TEST_MANAGER_EMAIL, passwords.manager);
await page.setViewportSize({width: 1440, height: 900});
await shot(page, "role-manager-desktop");
await page.setViewportSize({width: 390, height: 844});
await shot(page, "role-manager-mobile");

await browser.close();
console.log(JSON.stringify({results, signUpStatus: signUp.status}));
