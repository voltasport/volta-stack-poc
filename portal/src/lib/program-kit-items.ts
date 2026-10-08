import type {AccessContext} from "@/lib/access";
import type {ProgramSizedItem} from "@/lib/data";
import {sql, sqlTransaction, type SqlStatement} from "@/lib/db";
import {isMissingColumn, isMissingTable} from "@/lib/db-errors";
import {ADULT_YOUTH_APPAREL, presetById} from "@/lib/sized-item-presets";

/** Legacy virtual items used before migration 004 (negative ids never collide with kit_items ids). */
export const LEGACY_JERSEY_ID = -1;
export const LEGACY_SHORT_ID = -2;

export const MAX_KIT_ITEMS_PER_PROGRAM = 30;
export const MAX_KIT_ITEM_NAME = 60;
export const MAX_SIZE_OPTIONS = 30;
export const MAX_SIZE_OPTION_LENGTH = 16;

export function legacySizedItems(): ProgramSizedItem[] {
  return [
    {id: LEGACY_JERSEY_ID, name: "Jersey", sizeOptions: [...ADULT_YOUTH_APPAREL], sortOrder: 0},
    {id: LEGACY_SHORT_ID, name: "Short", sizeOptions: [...ADULT_YOUTH_APPAREL], sortOrder: 1},
  ];
}

// Readiness of migration 004. "Ready" is cached for the life of the instance; "not ready" is
// re-checked at most once a minute so instances pick up the migration without a redeploy.
const NOT_READY_RECHECK_MS = 60_000;
let readyCache: {ready: boolean; checkedAt: number} | null = null;

export async function kitSizesReady(): Promise<boolean> {
  if (readyCache?.ready) return true;
  if (readyCache && Date.now() - readyCache.checkedAt < NOT_READY_RECHECK_MS) return false;
  try {
    await sql().query(`select size_options from kit_items limit 0`);
    await sql().query(`select 1 from roster_row_sizes limit 0`);
    readyCache = {ready: true, checkedAt: Date.now()};
  } catch (error) {
    if (isMissingColumn(error, "size_options") || isMissingTable(error, "roster_row_sizes")) {
      readyCache = {ready: false, checkedAt: Date.now()};
    } else {
      throw error;
    }
  }
  return readyCache.ready;
}

export function canViewProgram(access: AccessContext, programSlug: string) {
  if (access.role === "admin") return true;
  return access.programSlugs !== null && access.programSlugs.includes(programSlug);
}

/** Directors and admins edit the kit list; managers only fill sizes on the roster. */
export function canEditProgramKitItems(access: AccessContext, programSlug: string) {
  if (access.role === "admin") return true;
  if (access.role !== "director") return false;
  return access.programSlugs !== null && access.programSlugs.includes(programSlug);
}

/** Sized kit items for a program (legacy Jersey/Short before migration 004). */
export async function loadSizedItems(programSlug: string): Promise<ProgramSizedItem[]> {
  if (!(await kitSizesReady())) return legacySizedItems();
  const rows = (await sql().query(
    `select id, name, size_options, sort_order
     from kit_items
     where program_slug = $1 and cardinality(size_options) > 0
     order by sort_order, id`,
    [programSlug],
  )) as {id: number | string; name: string; size_options: string[]; sort_order: number}[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    sizeOptions: row.size_options ?? [],
    sortOrder: row.sort_order,
  }));
}

/** roster row id -> (kit item id -> size) for the given programs. Empty before migration 004. */
export async function loadRosterSizes(programSlugs: string[]) {
  const map = new Map<number, Record<number, string>>();
  if (programSlugs.length === 0 || !(await kitSizesReady())) return map;
  const rows = (await sql().query(
    `select s.roster_row_id, s.kit_item_id, s.size_value
     from roster_row_sizes s
     join roster_rows r on r.id = s.roster_row_id
     where r.program_slug = any($1::text[])`,
    [programSlugs],
  )) as {roster_row_id: number | string; kit_item_id: number | string; size_value: string}[];
  for (const row of rows) {
    const rowId = Number(row.roster_row_id);
    const current = map.get(rowId) ?? {};
    current[Number(row.kit_item_id)] = row.size_value;
    map.set(rowId, current);
  }
  return map;
}

export function buildRosterCsvTemplate(items: Pick<ProgramSizedItem, "name" | "sizeOptions">[]) {
  const headers = ["name", "number", "back_name", ...items.map((item) => item.name)];
  const sample = (index: number) =>
    items.map((item) => item.sizeOptions[Math.min(index, item.sizeOptions.length - 1)] ?? "");
  return [
    headers.join(","),
    ["Alex Example", "10", "EXAMPLE", ...sample(4)].join(","),
    ["Jordan Lee", "7", "LEE", ...sample(5)].join(","),
  ].join("\n");
}

export function computeProgramWeekNote(input: {
  rosterCount: number;
  missingSizes: number;
  sizedItemCount: number;
}) {
  if (input.rosterCount === 0) {
    return "Your program is set up. Add your roster next so sizing and production can move forward.";
  }
  if (input.sizedItemCount === 0) {
    return `${input.rosterCount} athlete${input.rosterCount === 1 ? "" : "s"} on the roster. Add sizes to kit items when you're ready to collect them.`;
  }
  if (input.missingSizes > 0) {
    return `${input.missingSizes} athlete${input.missingSizes === 1 ? "" : "s"} still need sizes across ${input.sizedItemCount} sized item${input.sizedItemCount === 1 ? "" : "s"}.`;
  }
  return "Roster and sizes look complete. Volta will reach out when proofs or production updates are ready.";
}

type KitItemInput = {name: string; sizeOptions: string[]};

function cleanKitItemInput(input: {name?: unknown; sizeOptions?: unknown}) {
  const name = String(input.name ?? "").trim();
  if (!name) return {ok: false as const, error: "Item name is required."};
  if (name.length > MAX_KIT_ITEM_NAME) {
    return {ok: false as const, error: `Item name is too long (max ${MAX_KIT_ITEM_NAME}).`};
  }
  const rawOptions = Array.isArray(input.sizeOptions) ? input.sizeOptions : [];
  const seen = new Set<string>();
  const sizeOptions: string[] = [];
  for (const raw of rawOptions) {
    const option = String(raw ?? "").trim();
    if (!option) continue;
    if (option.length > MAX_SIZE_OPTION_LENGTH) {
      return {ok: false as const, error: `Size "${option.slice(0, 20)}" is too long (max ${MAX_SIZE_OPTION_LENGTH}).`};
    }
    if (seen.has(option.toLowerCase())) continue;
    seen.add(option.toLowerCase());
    sizeOptions.push(option);
  }
  if (sizeOptions.length > MAX_SIZE_OPTIONS) {
    return {ok: false as const, error: `Too many sizes (max ${MAX_SIZE_OPTIONS}).`};
  }
  return {ok: true as const, item: {name, sizeOptions} satisfies KitItemInput};
}

/** Recompute roster "sizes complete" flags for a program after its sized items change. */
function recomputeSubmittedStatement(programSlug: string): SqlStatement {
  return {
    text: `update roster_rows r
           set submitted = not exists (
             select 1 from kit_items k
             where k.program_slug = r.program_slug
               and cardinality(k.size_options) > 0
               and not exists (
                 select 1 from roster_row_sizes s
                 where s.roster_row_id = r.id
                   and s.kit_item_id = k.id
                   and lower(s.size_value) = any(select lower(o) from unnest(k.size_options) as o)
               )
           )
           where r.program_slug = $1`,
    params: [programSlug],
  };
}

async function existingItemNames(programSlug: string) {
  const rows = (await sql().query(`select name from kit_items where program_slug = $1`, [
    programSlug,
  ])) as {name: string}[];
  return rows.map((row) => row.name.toLowerCase());
}

function insertKitItemStatement(programSlug: string, item: KitItemInput): SqlStatement {
  return {
    text: `insert into kit_items (program_slug, name, qty, proof, status, sort_order, size_options)
           select $1, $2, '—', '', 'Planned',
                  coalesce((select max(sort_order) from kit_items where program_slug = $1), -1) + 1,
                  $3::text[]
           where not exists (
             select 1 from kit_items where program_slug = $1 and lower(name) = lower($2)
           )`,
    params: [programSlug, item.name, item.sizeOptions],
  };
}

export async function addKitItem(
  access: AccessContext,
  programSlug: string,
  input: {name?: unknown; sizeOptions?: unknown},
) {
  if (!canEditProgramKitItems(access, programSlug)) return {ok: false as const, error: "Forbidden"};
  if (!(await kitSizesReady())) {
    return {ok: false as const, error: "Item editing isn't available yet. Try again in a few minutes."};
  }
  const cleaned = cleanKitItemInput(input);
  if (!cleaned.ok) return cleaned;
  const names = await existingItemNames(programSlug);
  if (names.length >= MAX_KIT_ITEMS_PER_PROGRAM) {
    return {ok: false as const, error: `A program can have up to ${MAX_KIT_ITEMS_PER_PROGRAM} items.`};
  }
  if (names.includes(cleaned.item.name.toLowerCase())) {
    return {ok: false as const, error: `"${cleaned.item.name}" is already in this kit.`};
  }
  await sqlTransaction([
    insertKitItemStatement(programSlug, cleaned.item),
    recomputeSubmittedStatement(programSlug),
  ]);
  return {ok: true as const};
}

export async function applyKitPreset(access: AccessContext, programSlug: string, presetId: string) {
  if (!canEditProgramKitItems(access, programSlug)) return {ok: false as const, error: "Forbidden"};
  if (!(await kitSizesReady())) {
    return {ok: false as const, error: "Item editing isn't available yet. Try again in a few minutes."};
  }
  const preset = presetById(presetId);
  if (!preset) return {ok: false as const, error: "Unknown preset."};
  const names = await existingItemNames(programSlug);
  const toAdd = preset.items.filter((item) => !names.includes(item.name.toLowerCase()));
  if (toAdd.length === 0) return {ok: true as const, added: 0};
  if (names.length + toAdd.length > MAX_KIT_ITEMS_PER_PROGRAM) {
    return {ok: false as const, error: `A program can have up to ${MAX_KIT_ITEMS_PER_PROGRAM} items.`};
  }
  await sqlTransaction([
    ...toAdd.map((item) => insertKitItemStatement(programSlug, item)),
    recomputeSubmittedStatement(programSlug),
  ]);
  return {ok: true as const, added: toAdd.length};
}

export async function updateKitItem(
  access: AccessContext,
  programSlug: string,
  itemId: unknown,
  input: {name?: unknown; sizeOptions?: unknown},
) {
  if (!canEditProgramKitItems(access, programSlug)) return {ok: false as const, error: "Forbidden"};
  if (!(await kitSizesReady())) {
    return {ok: false as const, error: "Item editing isn't available yet. Try again in a few minutes."};
  }
  const id = Number(itemId);
  if (!Number.isSafeInteger(id) || id <= 0) return {ok: false as const, error: "Item id is required."};
  const cleaned = cleanKitItemInput(input);
  if (!cleaned.ok) return cleaned;
  const clash = (await sql().query(
    `select 1 from kit_items where program_slug = $1 and lower(name) = lower($2) and id <> $3 limit 1`,
    [programSlug, cleaned.item.name, id],
  )) as unknown[];
  if (clash.length > 0) {
    return {ok: false as const, error: `"${cleaned.item.name}" is already in this kit.`};
  }
  await sqlTransaction([
    {
      text: `update kit_items set name = $3, size_options = $4::text[]
             where id = $1 and program_slug = $2`,
      params: [id, programSlug, cleaned.item.name, cleaned.item.sizeOptions],
    },
    // Item became unsized: its stored roster sizes no longer apply.
    {
      text: `delete from roster_row_sizes s
             using kit_items k
             where s.kit_item_id = k.id and k.id = $1 and k.program_slug = $2
               and cardinality(k.size_options) = 0`,
      params: [id, programSlug],
    },
    recomputeSubmittedStatement(programSlug),
  ]);
  return {ok: true as const};
}

export async function deleteKitItem(access: AccessContext, programSlug: string, itemId: unknown) {
  if (!canEditProgramKitItems(access, programSlug)) return {ok: false as const, error: "Forbidden"};
  if (!(await kitSizesReady())) {
    return {ok: false as const, error: "Item editing isn't available yet. Try again in a few minutes."};
  }
  const id = Number(itemId);
  if (!Number.isSafeInteger(id) || id <= 0) return {ok: false as const, error: "Item id is required."};
  // Directors may remove items they added; items Volta has started on (proofs) are admin-only.
  const rows = (await sql().query(`select proof from kit_items where id = $1 and program_slug = $2`, [
    id,
    programSlug,
  ])) as {proof: string}[];
  if (!rows[0]) return {ok: false as const, error: "Item not found."};
  const proof = rows[0].proof.trim();
  if (access.role !== "admin" && proof && proof !== "—") {
    return {ok: false as const, error: "This item already has proofs. Ask your Volta rep to remove it."};
  }
  await sqlTransaction([
    {text: `delete from kit_items where id = $1 and program_slug = $2`, params: [id, programSlug]},
    recomputeSubmittedStatement(programSlug),
  ]);
  return {ok: true as const};
}

/** Seed a new program's kit from a preset ("none" leaves it empty). No-op before migration 004. */
export async function createKitItemsFromPreset(programSlug: string, presetId: string | undefined) {
  if (presetId === "none") return;
  if (!(await kitSizesReady())) return;
  const preset = presetById(presetId ?? "") ?? presetById("default-kit");
  if (!preset) return;
  await sqlTransaction(preset.items.map((item) => insertKitItemStatement(programSlug, item)));
}

/** Per-program count of athletes missing at least one valid size (only programs with sized items). */
export async function missingSizesByProgram(programSlugs: string[] | null) {
  if (!(await kitSizesReady())) return [] as {slug: string; name: string; missing: number}[];
  if (programSlugs !== null && programSlugs.length === 0) return [];
  const filter = programSlugs === null ? "" : "where p.slug = any($1::text[])";
  const rows = (await sql().query(
    `select p.slug, p.name, count(*)::int as missing
     from roster_rows r
     join programs p on p.slug = r.program_slug
     ${filter}
     ${filter ? "and" : "where"} exists (
       select 1 from kit_items k
       where k.program_slug = r.program_slug
         and cardinality(k.size_options) > 0
         and not exists (
           select 1 from roster_row_sizes s
           where s.roster_row_id = r.id and s.kit_item_id = k.id
             and lower(s.size_value) = any(select lower(o) from unnest(k.size_options) as o)
         )
     )
     group by p.slug, p.name, p.sort_order
     order by p.sort_order`,
    programSlugs === null ? [] : [programSlugs],
  )) as {slug: string; name: string; missing: number}[];
  return rows;
}
