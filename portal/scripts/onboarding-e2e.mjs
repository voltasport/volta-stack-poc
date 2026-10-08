import {chromium} from "playwright";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {Pool} from "pg";
import {
  assertLocalDatabaseUrl,
  loginViaApi,
  onboardingE2eCredentials,
  purgeOnboardingUserByEmail,
} from "./onboarding-e2e-helpers.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

assertLocalDatabaseUrl();

const base = process.env.PORTAL_BASE_URL ?? "http://localhost:3001";
const out = process.env.E2E_ARTIFACTS_DIR ?? "/opt/cursor/artifacts";
mkdirSync(out, {recursive: true});
const creds = onboardingE2eCredentials();

async function capture(page, filename, width, height) {
  await page.setViewportSize({width, height});
  await page.screenshot({path: `${out}/${filename}`, fullPage: true});
  return filename;
}
const report = {
  base,
  benEmail: creds.benEmail,
  steps: [],
  ok: false,
  finishedAt: null,
  screenshots: [],
};

function step(name, detail, pass = true) {
  report.steps.push({name, detail, pass});
  if (!pass) throw new Error(`${name}: ${detail}`);
}

try {
  const purge = await purgeOnboardingUserByEmail(creds.benEmail);
  step("purge_ben", purge.deleted ? `Removed existing ${creds.benEmail}` : "No existing user");

  const browser = await chromium.launch();
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await loginViaApi(adminCtx, base, creds.adminEmail, creds.adminPassword);

  await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
  await adminPage.fill('input[name="name"]', creds.benName);
  await adminPage.fill('input[name="email"]', creds.benEmail);
  await adminPage.selectOption('select[name="role"]', "director");
  await adminPage.click('form button[type="submit"]:has-text("Create user")');
  await adminPage.waitForSelector(`text=${creds.benEmail}`, {timeout: 20000});
  step("admin_create_user", "Created director via Users UI");

  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const benId = (
    await pool.query(`select id from "user" where lower(email) = lower($1)`, [creds.benEmail])
  ).rows[0]?.id;
  await pool.end();
  if (!benId) step("resolve_ben_id", "Ben missing after create", false);

  const inviteRes = await adminCtx.request.post(`${base}/api/admin/users/${benId}/invite`, {
    data: {sendEmail: true},
  });
  const inviteJson = await inviteRes.json();
  if (!inviteRes.ok() || !inviteJson.url) {
    step("send_invite", inviteJson.error ?? "No invite URL", false);
  }
  step(
    "send_invite",
    inviteJson.emailSent
      ? "Resend path (unexpected in local log mode)"
      : `Log transport / copy-link (${inviteJson.detail ?? "not_configured"})`,
  );

  const inviteUrl = inviteJson.url;
  const benCtx = await browser.newContext();
  const benPage = await benCtx.newPage();
  await benPage.goto(inviteUrl, {waitUntil: "networkidle"});
  await benPage.fill('input[type="password"]', creds.benPassword);
  await benPage.click('button[type="submit"]');
  await benPage.waitForURL((url) => !url.pathname.includes("/reset-password"), {timeout: 30000});
  step("set_password", "Password set via invite link");

  await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
  let overviewText = await benPage.locator("body").innerText();
  if (overviewText.includes("Sign in") || benPage.url().includes("/login")) {
    await benPage.goto(`${base}/login`, {waitUntil: "networkidle"});
    await benPage.fill('input[name="email"]', creds.benEmail);
    await benPage.fill('input[name="password"]', creds.benPassword);
    await benPage.click('button[type="submit"]');
    await benPage.waitForURL((url) => !url.pathname.includes("/login"), {timeout: 20000});
    await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
    overviewText = await benPage.locator("body").innerText();
  }
  step("first_login", "Session active on overview after set-password");

  overviewText = await benPage.locator("body").innerText();
  if (!overviewText.includes("Create your first program")) {
    step("checklist", "Expected onboarding checklist on overview", false);
  }
  if (overviewText.includes("NEEDS YOU") || overviewText.includes("LATEST FROM VOLTA")) {
    step("overview_no_leak_widgets", "Onboarding overview must not show Needs you / Latest cards", false);
  }
  if (/Women'?s Soccer|Cross Country|missing sizes/i.test(overviewText)) {
    step("overview_no_foreign_data", "Foreign school tasks visible on fresh director overview", false);
  }
  step("checklist", "Onboarding checklist visible without overview sidebar widgets");
  report.screenshots.push(await capture(benPage, "e2e-overview-fresh-1440.png", 1440, 900));
  report.screenshots.push(await capture(benPage, "e2e-overview-fresh-1024.png", 1024, 768));

  await benPage.getByRole("button", {name: "+ New program"}).click();
  const orgField = benPage.locator('input[name="organizationName"]');
  await orgField.waitFor({state: "visible"});
  const orgValue = await orgField.inputValue();
  if (!orgValue.trim()) {
    await orgField.fill("And Collar");
  }
  await benPage.fill('input[name="name"]', "E2E Academy Soccer");
  await benPage.fill('input[name="sport"]', "Soccer");
  await benPage.fill('input[name="levelOrSeason"]', "Varsity · Fall 2026");
  await benPage.fill('input[name="rosterSize"]', "18");
  await benPage.getByRole("button", {name: "Create program"}).click();
  await benPage.waitForURL(/\/programs\//, {timeout: 20000});
  const programUrl = benPage.url();
  step("create_program", `Program created (${programUrl})`);

  const programSlug = programUrl.match(/\/programs\/([^/?]+)/)?.[1];
  const modePool = new Pool({connectionString: process.env.DATABASE_URL});
  const kitMode = (
    await modePool.query(
      `select 1 from information_schema.columns where table_name = 'kit_items' and column_name = 'size_options'`,
    )
  ).rows.length > 0;
  await modePool.end();
  report.mode = kitMode ? "kit-items (migration 004)" : "legacy (before migration 004)";

  // Items tab: one kit list; sized items carry size options, unsized items (bag) don't.
  await benPage.goto(programUrl.split("?")[0], {waitUntil: "networkidle"});
  const itemsText = await benPage.locator("body").innerText();
  if (itemsText.includes("Sized items")) step("items_tab", "Separate Sized items tab still present", false);
  if (kitMode) {
    if (!itemsText.includes("Jersey") || !itemsText.includes("Short")) {
      step("items_tab", "Starting kit (Jersey + Short) missing from Items tab", false);
    }
    const addItem = async (name, sizes) => {
      await benPage.getByLabel(/Item name/).last().fill(name);
      await benPage.getByLabel(/Sizes \(comma separated/).fill(sizes);
      await benPage.getByRole("button", {name: "Add item", exact: true}).click();
      await benPage.locator("td", {hasText: name}).first().waitFor({timeout: 10000});
    };
    await addItem("Hoodie", "S, M, L, XL");
    await addItem("Hat", "S/M, L/XL, One size");
    await benPage.getByRole("button", {name: "+ Bag (no sizes)"}).click();
    await benPage.locator("td", {hasText: "Bag"}).first().waitFor({timeout: 10000});
    step("kit_items", "Added Hoodie + Hat (sized) and Bag (unsized) on the Items tab");
  } else {
    if (itemsText.includes("ADD ITEM")) step("items_tab", "Item editing shown before migration 004", false);
    step("kit_items", "Legacy mode: Items tab read-only, roster uses Jersey/Short");
  }
  report.screenshots.push(await capture(benPage, "e2e-items-tab-1440.png", 1440, 900));
  report.screenshots.push(await capture(benPage, "e2e-items-tab-1024.png", 1024, 768));

  await benPage.goto(`${base}/`, {waitUntil: "networkidle"});
  const checklistAfterProgram = await benPage.locator("body").innerText();
  if (!checklistAfterProgram.includes("Add your roster")) {
    step("checklist_step2", "Step 2 visible after program create", false);
  }
  if (!checklistAfterProgram.includes("IMPORT ROSTER")) {
    step("checklist_import", "Import roster panel visible in checklist step 2", false);
  }
  step("checklist_step2", "Roster step stays visible after program create");

  await benPage.reload({waitUntil: "networkidle"});
  const pickerText = await benPage.locator("body").innerText();
  if (pickerText.includes("No school assigned yet")) {
    step("school_picker", "Picker still shows pending after program create", false);
  }
  step("school_picker", "Organization visible in school picker after program create");
  report.screenshots.push(await capture(benPage, "e2e-checklist-step2-1440.png", 1440, 900));
  report.screenshots.push(await capture(benPage, "e2e-checklist-step2-1024.png", 1024, 768));

  const header = kitMode ? "name,number,back_name,Jersey,Short,Hoodie,Hat" : "name,number,back_name,Jersey,Short";
  const badCsv = kitMode
    ? `${header}\nAlex Example,10,EXAMPLE,M,M,L,ZZZ\nJordan Lee,7,LEE,L,L,M,S/M`
    : `${header}\nAlex Example,10,EXAMPLE,M,ZZZ\nJordan Lee,7,LEE,L,L`;
  await benPage.getByLabel("Roster CSV").first().fill(badCsv);
  await benPage.getByRole("button", {name: "Preview import"}).first().click();
  await benPage.waitForSelector("text=Invalid", {timeout: 15000});
  const previewHeaders = await benPage.locator("table").first().locator("th").allInnerTexts();
  const expectedCols = kitMode ? ["Jersey", "Short", "Hoodie", "Hat"] : ["Jersey", "Short"];
  for (const col of expectedCols) {
    if (!previewHeaders.map((h) => h.trim()).includes(col)) {
      step("csv_preview_columns", `Preview missing ${col} column (got ${previewHeaders.join("|")})`, false);
    }
  }
  if (previewHeaders.map((h) => h.trim()).includes("Bag")) {
    step("csv_preview_columns", "Unsized Bag should not be a size column", false);
  }
  const previewText = await benPage.locator("table").first().innerText();
  if (!/\bM\b/.test(previewText) || !/\bL\b/.test(previewText)) {
    step("csv_preview_values", "Preview did not show parsed size values", false);
  }
  step("csv_import_validation", `Preview shows ${expectedCols.join("/")} values and flags the invalid size`);
  report.screenshots.push(await capture(benPage, "e2e-import-preview-error-1440.png", 1440, 900));
  report.screenshots.push(await capture(benPage, "e2e-import-preview-error-1024.png", 1024, 768));

  const goodCsv = kitMode
    ? `${header}\nAlex Example,10,EXAMPLE,M,M,L,S/M\nJordan Lee,7,LEE,L,L,M,s/m`
    : `${header}\nAlex Example,10,EXAMPLE,M,M\nJordan Lee,7,LEE,L,L`;
  await benPage.getByLabel("Roster CSV").first().fill(goodCsv);
  await benPage.getByRole("button", {name: "Preview import"}).first().click();
  await benPage.waitForSelector("text=ready to save", {timeout: 15000});
  await benPage.getByRole("button", {name: "Save to roster"}).first().click();
  await benPage.waitForSelector("text=/Saved \\d+ players/", {timeout: 15000});
  step("csv_import", "CSV preview + save persisted roster rows");

  {
    const pool2 = new Pool({connectionString: process.env.DATABASE_URL});
    const rows = (
      await pool2.query(
        `select id, name, jersey, short, submitted from roster_rows where program_slug = $1 order by sort_order`,
        [programSlug],
      )
    ).rows;
    if (rows.length < 2) step("csv_import_db", `Expected 2 roster rows, got ${rows.length}`, false);
    if (rows[0].jersey !== "M" || rows[1].short !== "L") {
      step("csv_import_db", `Legacy jersey/short columns not filled: ${JSON.stringify(rows)}`, false);
    }
    if (kitMode) {
      const sizes = (
        await pool2.query(
          `select k.name, s.size_value from roster_row_sizes s join kit_items k on k.id = s.kit_item_id
           join roster_rows r on r.id = s.roster_row_id where r.program_slug = $1 order by r.sort_order, k.sort_order`,
          [programSlug],
        )
      ).rows;
      if (sizes.length !== 8) step("csv_import_db", `Expected 8 size values, got ${JSON.stringify(sizes)}`, false);
      if (!sizes.some((row) => row.name === "Hat" && row.size_value === "S/M")) {
        step("csv_import_db", "Hat size not normalized to S/M", false);
      }
      if (!rows.every((row) => row.submitted)) step("csv_import_db", "Rows should be sizes-complete", false);
    }
    await pool2.end();
    step("csv_import_db", `DB rows and sizes saved (${rows.length} players)`);
  }

  await benPage.goto(`${programUrl.split("?")[0]}?tab=roster`, {waitUntil: "networkidle"});
  report.screenshots.push(await capture(benPage, "e2e-roster-multi-items-1440.png", 1440, 900));
  await benPage.fill('input[placeholder="#"]', "99");
  await benPage.fill('input[placeholder="Name"]', "Manual Player");
  await benPage.locator("label:has-text('Jersey') select").first().selectOption("L");
  const rosterHeaders = (await benPage.locator("table").last().locator("th").allInnerTexts()).map((h) => h.trim());
  for (const col of expectedCols) {
    if (!rosterHeaders.includes(col)) step("roster_columns", `Roster missing ${col} column`, false);
  }
  if (rosterHeaders.includes("Bag")) step("roster_columns", "Unsized Bag should not be a roster column", false);
  await benPage.getByRole("button", {name: "Add player"}).click();
  await benPage.waitForTimeout(500);
  const rosterText = await benPage.locator("body").innerText();
  if (!rosterText.includes("Manual Player")) {
    step("add_roster", "Roster row not visible after add", false);
  }
  step("add_roster", "Manual roster player saved");
  report.screenshots.push(await capture(benPage, "e2e-roster-1440.png", 1440, 900));
  report.screenshots.push(await capture(benPage, "e2e-roster-1024.png", 1024, 768));

  await adminPage.goto(`${base}/users`, {waitUntil: "networkidle"});
  const benRow = adminPage.locator("li").filter({hasText: creds.benEmail});
  await benRow.getByRole("button", {name: "Delete user"}).click();
  await adminPage.waitForSelector('[role="dialog"]', {timeout: 10000});
  report.screenshots.push(await capture(adminPage, "e2e-delete-user-modal-1440.png", 1440, 900));
  await adminPage.getByRole("button", {name: "Cancel"}).click();

  await purgeOnboardingUserByEmail(creds.benEmail);
  step("cleanup", "Purged Ben after successful flow");

  report.ok = true;
  await browser.close();
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  report.ok = false;
}

report.finishedAt = new Date().toISOString();
writeFileSync(`${out}/onboarding-e2e-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
