import {randomBytes} from "node:crypto";
import type {AccessContext} from "@/lib/access";
import {sql, sqlTransaction, type SqlStatement} from "@/lib/db";
import {
  ensurePortalOrganization,
  linkUserToOrganization,
  organizationNameFromEmail,
  slugifyOrganizationName,
} from "@/lib/portal-organizations";
import {
  createKitItemsFromPreset,
  kitSizesReady,
  loadSizedItems,
} from "@/lib/program-kit-items";
import type {ProgramSizedItem} from "@/lib/data";
import {normalizeSizeValue, rosterBackName, rowSizesComplete} from "@/lib/roster-utils";
import type {ValidatedRosterCsvRow} from "@/lib/roster-csv";

export type CreateProgramInput = {
  name: string;
  sport: string;
  levelOrSeason: string;
  rosterSize?: number | null;
  organizationName: string;
  sizedItemsPresetId?: string;
};

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "program";
}

async function nextSortOrder() {
  const rows = (await sql().query(`select coalesce(max(sort_order), -1) + 1 as next from programs`)) as {
    next: number;
  }[];
  return rows[0]?.next ?? 0;
}

function defaultMilestones(programSlug: string) {
  const labels = [
    {label: "Kickoff", date: "TBD", state: "now"},
    {label: "Design", date: "TBD", state: "next"},
    {label: "Proof", date: "TBD", state: "next"},
    {label: "Production", date: "TBD", state: "next"},
    {label: "Delivery", date: "TBD", state: "next"},
    {label: "Complete", date: "TBD", state: "next"},
  ];
  return labels.map((m, sort_order) => ({programSlug, ...m, sort_order}));
}

export async function createProgramForUser(access: AccessContext, input: CreateProgramInput) {
  if (access.role !== "admin" && access.role !== "director" && access.role !== "manager") {
    return {ok: false as const, error: "Forbidden"};
  }

  const name = input.name.trim();
  const sport = input.sport.trim();
  const levelOrSeason = input.levelOrSeason.trim();
  if (!name || !sport || !levelOrSeason) {
    return {ok: false as const, error: "Name, sport, and level or season are required."};
  }

  let schoolSlug: string;
  const orgName =
    input.organizationName.trim() || organizationNameFromEmail(access.email);
  const org = await ensurePortalOrganization(orgName);
  if (org.ok) {
    schoolSlug = org.slug;
    if (access.role !== "admin") {
      await linkUserToOrganization(access.userId, org.slug);
    }
  } else if (org.error.includes("db:migrate")) {
    schoolSlug = slugifyOrganizationName(orgName).slice(0, 48);
  } else {
    return {ok: false as const, error: org.error};
  }
  let slug = slugify(name);
  const taken = (await sql().query(`select slug from programs where slug = $1`, [slug])) as {
    slug: string;
  }[];
  if (taken[0]) slug = `${slug}-${randomBytes(3).toString("hex")}`;

  const rosterSize = input.rosterSize && input.rosterSize > 0 ? input.rosterSize : null;
  const line = rosterSize
    ? `${sport} · ${levelOrSeason} · ${rosterSize} athletes`
    : `${sport} · ${levelOrSeason}`;
  const sortOrder = await nextSortOrder();

  await sql().query(
    `insert into programs (
      slug, name, line, meta, stage, status, filled, total, eyebrow, title,
      delivery_label, delivery_date, phase, week_note, week_author, ship_to, ship_note, school_slug, sort_order
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
    )`,
    [
      slug,
      name,
      line,
      "Starting",
      "Starting",
      "Starting",
      0,
      6,
      name,
      name.toUpperCase(),
      "Delivery",
      "TBD",
      "KICKOFF",
      "Your program is set up. Add your roster next so sizing and production can move forward.",
      "Volta portal",
      "",
      "",
      schoolSlug,
      sortOrder,
    ],
  );

  for (const milestone of defaultMilestones(slug)) {
    await sql().query(
      `insert into milestones (program_slug, label, date, state, sort_order)
       values ($1, $2, $3, $4, $5)`,
      [milestone.programSlug, milestone.label, milestone.date, milestone.state, milestone.sort_order],
    );
  }

  if (access.role !== "admin") {
    await sql().query(
      `insert into user_program_assignments (user_id, program_slug) values ($1, $2)
       on conflict do nothing`,
      [access.userId, slug],
    );
  }

  await createKitItemsFromPreset(slug, input.sizedItemsPresetId);

  return {ok: true as const, slug};
}

export async function userHasAssignedProgram(userId: string) {
  const rows = (await sql().query(
    `select 1 from user_program_assignments where user_id = $1 limit 1`,
    [userId],
  )) as {unknown: number}[];
  return rows.length > 0;
}

export async function userHasRosterOnAssignedPrograms(userId: string) {
  const rows = (await sql().query(
    `select 1
     from roster_rows r
     join user_program_assignments a on a.program_slug = r.program_slug
     where a.user_id = $1
     limit 1`,
    [userId],
  )) as {unknown: number}[];
  return rows.length > 0;
}

export async function primaryProgramSlugForUser(userId: string) {
  const rows = (await sql().query(
    `select program_slug from user_program_assignments where user_id = $1 order by created_at limit 1`,
    [userId],
  )) as {program_slug: string}[];
  return rows[0]?.program_slug ?? null;
}

type RosterInsertRow = {
  num: string;
  name: string;
  pos: string;
  back: string;
  sizes: Record<number, string>;
};

/** Legacy jersey/short columns mirror the items named Jersey/Short (kept for older readers). */
function legacyColumns(items: ProgramSizedItem[], sizes: Record<number, string>) {
  const pick = (name: string) => {
    const item = items.find((entry) => entry.name.toLowerCase() === name);
    return (item && sizes[item.id]) || "—";
  };
  return {jersey: pick("jersey"), short: pick("short")};
}

/**
 * Statement inserting roster rows (and, after migration 004, their per-item sizes) in one
 * atomic SQL statement. Sizes are only attached to kit items that belong to this program.
 */
function insertRosterRowsStatement(
  programSlug: string,
  rows: RosterInsertRow[],
  items: ProgramSizedItem[],
  sizesReady: boolean,
): SqlStatement {
  const columns = rows.map((row) => ({...row, ...legacyColumns(items, row.sizes)}));
  const params = [
    programSlug,
    columns.map((row) => row.num),
    columns.map((row) => row.name),
    columns.map((row) => row.pos || "—"),
    columns.map((row) => row.jersey),
    columns.map((row) => row.short),
    columns.map((row) => row.back),
    columns.map((row) => (rowSizesComplete(items, row.sizes) ? "true" : "false")),
    columns.map((row) =>
      JSON.stringify(
        Object.fromEntries(Object.entries(row.sizes).filter(([id]) => Number(id) > 0)),
      ),
    ),
  ];
  const insertRows = `
    with input as (
      select *
      from unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
        with ordinality as u(num, name, pos, jersey, short, back, submitted, sizes, ord)
    ),
    base as (
      select coalesce(max(sort_order), -1) as m from roster_rows where program_slug = $1
    ),
    ins as (
      insert into roster_rows (program_slug, num, name, pos, jersey, short, back, submitted, sort_order)
      select $1, i.num, i.name, i.pos, i.jersey, i.short, i.back, i.submitted::boolean, base.m + i.ord
      from input i cross join base
      order by i.ord
      returning id, sort_order
    )`;
  if (!sizesReady) {
    return {text: `${insertRows} select count(*) from ins`, params};
  }
  return {
    text: `${insertRows}
      insert into roster_row_sizes (roster_row_id, kit_item_id, size_value)
      select ins.id, kv.key::bigint, kv.value
      from ins
      cross join base
      join input i on base.m + i.ord = ins.sort_order
      cross join lateral jsonb_each_text(i.sizes::jsonb) as kv
      where kv.key::bigint in (
        select k.id from kit_items k where k.program_slug = $1 and cardinality(k.size_options) > 0
      )`,
    params,
  };
}

export async function importRosterCsvRows(
  access: AccessContext,
  programSlug: string,
  rows: ValidatedRosterCsvRow[],
  mode: "append" | "replace",
) {
  if (!(await assertCanEditProgramRoster(access, programSlug))) {
    return {ok: false as const, error: "Forbidden"};
  }
  const valid = rows.filter((row) => row.ok);
  if (valid.length === 0) {
    return {ok: false as const, error: "Add at least one valid player."};
  }

  const sizesReady = await kitSizesReady();
  const items = await loadSizedItems(programSlug);

  // One transaction: a failed import never leaves a half-replaced roster.
  const statements: SqlStatement[] = [];
  if (mode === "replace") {
    statements.push({text: `delete from roster_rows where program_slug = $1`, params: [programSlug]});
  }
  statements.push(insertRosterRowsStatement(programSlug, valid, items, sizesReady));
  await sqlTransaction(statements);

  return {ok: true as const, count: valid.length};
}

export async function assertCanEditProgramRoster(access: AccessContext, programSlug: string) {
  if (access.role === "admin") return true;
  if (access.programSlugs === null) return false;
  return access.programSlugs.includes(programSlug);
}

export {rosterRowSubmitted} from "@/lib/roster-utils";

/** Validate client-supplied sizes against the program's sized items (keys are kit item ids). */
function cleanRowSizes(items: ProgramSizedItem[], raw: unknown) {
  const sizes: Record<number, string> = {};
  if (!raw || typeof raw !== "object") return {ok: true as const, sizes};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const item = items.find((entry) => entry.id === Number(key));
    const text = String(value ?? "").trim();
    if (!item || !text || text === "—") continue;
    const normalized = normalizeSizeValue(text, item.sizeOptions);
    if (!normalized) {
      return {ok: false as const, error: `Invalid ${item.name} size "${text.slice(0, 20)}".`};
    }
    sizes[item.id] = normalized;
  }
  return {ok: true as const, sizes};
}

export async function upsertRosterPlayer(
  access: AccessContext,
  programSlug: string,
  input: {
    num: string;
    name: string;
    pos?: string;
    jersey?: string;
    short?: string;
    back?: string;
    sizes?: unknown;
    rowId?: number;
  },
) {
  if (!(await assertCanEditProgramRoster(access, programSlug))) {
    return {ok: false as const, error: "Forbidden"};
  }
  const num = input.num.trim();
  const name = input.name.trim();
  const pos = (input.pos ?? "—").trim() || "—";
  if (!num || !name) {
    return {ok: false as const, error: "Number and name are required."};
  }
  if (num.length > 8 || name.length > 80) {
    return {ok: false as const, error: "Number or name is too long."};
  }
  const back = (input.back ?? "").trim() || rosterBackName(name);
  if (pos.length > 24 || back.length > 24) {
    return {ok: false as const, error: "Position or back name is too long."};
  }

  const sizesReady = await kitSizesReady();
  const items = await loadSizedItems(programSlug);
  // Older clients may still send jersey/short; map them onto the matching items.
  const rawSizes: Record<string, unknown> = {...((input.sizes as Record<string, unknown>) ?? {})};
  for (const [field, value] of [["jersey", input.jersey], ["short", input.short]] as const) {
    const item = items.find((entry) => entry.name.toLowerCase() === field);
    if (item && value && rawSizes[item.id] === undefined) rawSizes[item.id] = value;
  }
  const cleaned = cleanRowSizes(items, rawSizes);
  if (!cleaned.ok) return cleaned;
  const sizes = cleaned.sizes;

  if (!input.rowId) {
    await sqlTransaction([
      insertRosterRowsStatement(programSlug, [{num, name, pos, back, sizes}], items, sizesReady),
    ]);
    return {ok: true as const};
  }

  const {jersey, short} = legacyColumns(items, sizes);
  const statements: SqlStatement[] = [
    {
      text: `update roster_rows
             set num = $2, name = $3, pos = $4, jersey = $5, short = $6, back = $7, submitted = $8
             where id = $1 and program_slug = $9`,
      params: [input.rowId, num, name, pos, jersey, short, back, rowSizesComplete(items, sizes), programSlug],
    },
  ];
  if (sizesReady) {
    statements.push({
      text: `delete from roster_row_sizes s
             using roster_rows r
             where s.roster_row_id = r.id and r.id = $1 and r.program_slug = $2`,
      params: [input.rowId, programSlug],
    });
    for (const [itemId, value] of Object.entries(sizes)) {
      statements.push({
        text: `insert into roster_row_sizes (roster_row_id, kit_item_id, size_value)
               select r.id, k.id, $3
               from roster_rows r
               join kit_items k on k.program_slug = r.program_slug
               where r.id = $1 and k.id = $2 and r.program_slug = $4`,
        params: [input.rowId, Number(itemId), value, programSlug],
      });
    }
  }
  await sqlTransaction(statements);
  return {ok: true as const};
}
