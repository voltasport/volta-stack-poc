import {chromium} from "playwright";
import {mkdirSync, writeFileSync} from "node:fs";
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
const report = {roles: []};

async function login(context, email, password) {
  const res = await context.request.post(`${base}/api/auth/sign-in/email`, {
    data: {email, password},
  });
  if (!res.ok()) {
    throw new Error(`login ${email}: ${res.status()} ${await res.text()}`);
  }
}

async function captureRole(browser, role, email, password, filePrefix) {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  const page = await ctx.newPage();
  await login(ctx, email, password);
  await page.goto(`${base}/`, {waitUntil: "networkidle"});
  await page.waitForSelector("h1:has-text('MORNING')", {timeout: 20000});

  const select = page.locator('select[aria-label="School"]');
  await select.waitFor({timeout: 10000});
  const options = await select.locator("option").allTextContents();
  const value = await select.inputValue();

  await select.click();
  await page.waitForTimeout(200);
  await page.screenshot({path: `${out}/${filePrefix}-dropdown-open.png`, fullPage: true});

  report.roles.push({role, email, selectedValue: value, options, file: `${filePrefix}-dropdown-open.png`});
  await ctx.close();
}

const browser = await chromium.launch();

await captureRole(browser, "admin", LOCAL_TEST_ADMIN_EMAIL, passwords.admin, "entity-switcher-admin");
await captureRole(
  browser,
  "director",
  LOCAL_TEST_DIRECTOR_EMAIL,
  passwords.director,
  "entity-switcher-director",
);
await captureRole(
  browser,
  "manager",
  LOCAL_TEST_MANAGER_EMAIL,
  passwords.manager,
  "entity-switcher-manager",
);

await browser.close();
writeFileSync(`${out}/entity-switcher-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

for (const row of report.roles) {
  const allCount = row.options.filter((o) => o === "All schools").length;
  if (allCount > 1) throw new Error(`${row.role}: All schools appears ${allCount} times`);
  if (row.role !== "admin" && allCount > 0) {
    throw new Error(`${row.role}: All schools should not appear`);
  }
  if (row.options.includes("Other Volta gear")) {
    throw new Error(`${row.role}: Other Volta gear should not be in picker`);
  }
  const unique = new Set(row.options);
  if (unique.size !== row.options.length) {
    throw new Error(`${row.role}: duplicate option labels: ${row.options.join(", ")}`);
  }
}
