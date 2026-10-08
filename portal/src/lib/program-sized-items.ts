import type {AccessContext} from "@/lib/access";
import {sql, sqlTransaction, type SqlStatement} from "@/lib/db";
import {isMissingTable} from "@/lib/db-errors";
import {ADULT_YOUTH_APPAREL, SIZED_ITEM_PRESETS} from "@/lib/sized-item-presets";
import {rosterBackName} from "@/lib/roster-utils";

export type ProgramSizedItem = {
  id: number;
  programSlug: string;
  name: string;
  sizeOptions: string[];
  sortOrder: number;
};

export type LegacySizedItem = {
  id: string;
  name: string;
  sizeOptions: string[];
  legacyColumn?: "jersey" | "short";
};

const LEGACY_JERSEY: LegacySizedItem = {
  id: "legacy-jersey",
  name: "Jersey",
  sizeOptions: [...ADULT_YOUTH_APPAREL],
  legacyColumn: "jersey",
};

const LEGACY_SHORT: LegacySizedItem = {
  id: "legacy-short",
  name: "Short",
  sizeOptions: [...ADULT_YOUTH_APPAREL],
  legacyColumn: "short",
};

let sizedItemsTableCache: boolean | null = null;

export async function programSizedItemsTableReady() {
  if (sizedItemsTableCache !== null) return sizedItemsTableCache;
  try {
    await sql().query(`select 1 from program_sized_items limit 1`);
    sizedItemsTableCache = true;
  } catch (error) {
    if (isMissingTable(error, "program_sized_items")) {
      sizedItemsTableCache = false;
    } else {
      throw error;
    }
  }
  return sizedItemsTableCache;
}

export function canEditProgramSizedItems(access: AccessContext, programSlug: string) {
  if (access.role === "admin") return true;
  if (access.role !== "director") return false;
  if (access.programSlugs === null) return false;
  return access.programSlugs.includes(programSlug);
}

export function normalizeSizeValue(raw: string, options: string[]) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return null;
  const match = options.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  return match ?? null;
}

export function rowSizesComplete(
  items: Pick<ProgramSizedItem, "id" | "sizeOptions">[],
  values: Record<number, string>,
) {
  if (items.length === 0) return true;
  return items.every((item) => {
    const value = values[item.id]?.trim();
    if (!value || value === "—") return false;
    return normalizeSizeValue(value, item.sizeOptions) !== null;
  });
}

export async function loadProgramSizedItems(programSlug: string): Promise<ProgramSizedItem[]> {
  if (!(await programSizedItemsTableReady())) return [];
  const rows = (await sql().query(
    `select id, program_slug, name, size_options, sort_order
     from program_sized_items
     where program_slug = $1
     order by sort_order, id`,
    [programSlug],
  )) as {
    id: number;
    program_slug: string;
    name: string;
    size_options: string[];
    sort_order: number;
  }[];
  return rows.map((row) => ({
    id: row.id,
    programSlug: row.program_slug,
    name: row.name,
    sizeOptions: row.size_options ?? [],
    sortOrder: row.sort_order,
  }));
}

export function legacySizedItemsForProgram(): LegacySizedItem[] {
  return [LEGACY_JERSEY, LEGACY_SHORT];
}

export async function ensureDefaultSizedItems(programSlug: string) {
  if (!(await programSizedItemsTableReady())) return;
  const existing = await loadProgramSizedItems(programSlug);
  if (existing.length > 0) return;
  const preset = SIZED_ITEM_PRESETS[0]!;
  for (const [index, item] of preset.items.entries()) {
    await sql().query(
      `insert into program_sized_items (program_slug, name, size_options, sort_order)
       values ($1, $2, $3, $4)
       on conflict (program_slug, name) do nothing`,
      [programSlug, item.name, item.sizeOptions, index],
    );
  }
}

export async function createSizedItemsFromPreset(programSlug: string, presetId: string) {
  const preset = SIZED_ITEM_PRESETS.find((entry) => entry.id === presetId) ?? SIZED_ITEM_PRESETS[0]!;
  if (!(await programSizedItemsTableReady())) return;
  for (const [index, item] of preset.items.entries()) {
    await sql().query(
      `insert into program_sized_items (program_slug, name, size_options, sort_order)
       values ($1, $2, $3, $4)
       on conflict (program_slug, name) do update
       set size_options = excluded.size_options, sort_order = excluded.sort_order`,
      [programSlug, item.name, item.sizeOptions, index],
    );
  }
}

export async function loadRosterRowSizeMap(programSlug: string) {
  if (!(await programSizedItemsTableReady())) return new Map<number, Record<number, string>>();
  const rows = (await sql().query(
    `select s.roster_row_id, s.sized_item_id, s.size_value
     from roster_row_sizes s
     join roster_rows r on r.id = s.roster_row_id
     where r.program_slug = $1`,
    [programSlug],
  )) as {roster_row_id: number; sized_item_id: number; size_value: string}[];
  const map = new Map<number, Record<number, string>>();
  for (const row of rows) {
    const current = map.get(row.roster_row_id) ?? {};
    current[row.sized_item_id] = row.size_value;
    map.set(row.roster_row_id, current);
  }
  return map;
}

export async function countFilledSizesForItem(sizedItemId: number) {
  if (!(await programSizedItemsTableReady())) return 0;
  const rows = (await sql().query(
    `select count(*)::int as n from roster_row_sizes
     where sized_item_id = $1 and trim(size_value) <> '' and size_value <> '—'`,
    [sizedItemId],
  )) as {n: number}[];
  return rows[0]?.n ?? 0;
}

export async function upsertRosterRowSizes(
  rosterRowId: number,
  programSlug: string,
  sizes: Record<number, string>,
  items: ProgramSizedItem[],
) {
  if (!(await programSizedItemsTableReady())) return;
  const statements: SqlStatement[] = [];
  for (const item of items) {
    const raw = sizes[item.id]?.trim() ?? "";
    if (!raw || raw === "—") {
      statements.push({
        text: `delete from roster_row_sizes where roster_row_id = $1 and sized_item_id = $2`,
        params: [rosterRowId, item.id],
      });
      continue;
    }
    const normalized = normalizeSizeValue(raw, item.sizeOptions);
    if (!normalized) continue;
    statements.push({
      text: `insert into roster_row_sizes (roster_row_id, sized_item_id, size_value)
             values ($1, $2, $3)
             on conflict (roster_row_id, sized_item_id) do update set size_value = excluded.size_value`,
      params: [rosterRowId, item.id, normalized],
    });
  }
  const complete = rowSizesComplete(items, sizes);
  statements.push({
    text: `update roster_rows set submitted = $2 where id = $1 and program_slug = $3`,
    params: [rosterRowId, complete, programSlug],
  });
  if (statements.length > 0) await sqlTransaction(statements);
}

export async function syncLegacyColumnsFromSizes(
  rosterRowId: number,
  items: ProgramSizedItem[],
  sizes: Record<number, string>,
) {
  const jerseyItem = items.find((item) => item.name.toLowerCase() === "jersey");
  const shortItem = items.find((item) => item.name.toLowerCase() === "short");
  const jersey = jerseyItem ? sizes[jerseyItem.id] ?? "—" : "—";
  const short = shortItem ? sizes[shortItem.id] ?? "—" : "—";
  await sql().query(`update roster_rows set jersey = $2, short = $3 where id = $1`, [
    rosterRowId,
    jersey || "—",
    short || "—",
  ]);
}

export function buildRosterCsvTemplate(items: Pick<ProgramSizedItem, "name">[]) {
  const headers = ["name", "number", "back_name", ...items.map((item) => item.name)];
  return `${headers.join(",")}\nAlex Example,10,EXAMPLE,${items.map(() => "M").join(",")}\n`;
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
    return `${input.rosterCount} athletes on the roster. Add sized kit items when you're ready to collect sizes.`;
  }
  if (input.missingSizes > 0) {
    return `${input.missingSizes} athlete${input.missingSizes === 1 ? "" : "s"} still need sizes across your ${input.sizedItemCount} kit items.`;
  }
  return "Roster and sizes look complete. Volta will reach out when proofs or production updates are ready.";
}

export async function addProgramSizedItem(
  access: AccessContext,
  programSlug: string,
  input: {name: string; sizeOptions: string[]},
) {
  if (!canEditProgramSizedItems(access, programSlug)) {
    return {ok: false as const, error: "Forbidden"};
  }
  if (!(await programSizedItemsTableReady())) {
    return {ok: false as const, error: "Sized items require migration 004 (npm run db:migrate)."};
  }
  const name = input.name.trim();
  if (!name) return {ok: false as const, error: "Name is required."};
  const sizeOptions = input.sizeOptions.map((option) => option.trim()).filter(Boolean);
  if (sizeOptions.length === 0) {
    return {ok: false as const, error: "Add at least one size option."};
  }
  const sortRows = (await sql().query(
    `select coalesce(max(sort_order), -1) + 1 as next from program_sized_items where program_slug = $1`,
    [programSlug],
  )) as {next: number}[];
  await sql().query(
    `insert into program_sized_items (program_slug, name, size_options, sort_order)
     values ($1, $2, $3, $4)`,
    [programSlug, name, sizeOptions, sortRows[0]?.next ?? 0],
  );
  return {ok: true as const};
}

export async function updateProgramSizedItem(
  access: AccessContext,
  programSlug: string,
  itemId: number,
  input: {name?: string; sizeOptions?: string[]; sortOrder?: number},
) {
  if (!canEditProgramSizedItems(access, programSlug)) {
    return {ok: false as const, error: "Forbidden"};
  }
  const fields: string[] = [];
  const params: unknown[] = [itemId, programSlug];
  if (input.name !== undefined) {
    params.push(input.name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (input.sizeOptions !== undefined) {
    const sizeOptions = input.sizeOptions.map((option) => option.trim()).filter(Boolean);
    if (sizeOptions.length === 0) {
      return {ok: false as const, error: "Add at least one size option."};
    }
    params.push(sizeOptions);
    fields.push(`size_options = $${params.length}`);
  }
  if (input.sortOrder !== undefined) {
    params.push(input.sortOrder);
    fields.push(`sort_order = $${params.length}`);
  }
  if (fields.length === 0) return {ok: true as const};
  await sql().query(
    `update program_sized_items set ${fields.join(", ")} where id = $1 and program_slug = $2`,
    params,
  );
  return {ok: true as const};
}

export async function deleteProgramSizedItem(
  access: AccessContext,
  programSlug: string,
  itemId: number,
) {
  if (!canEditProgramSizedItems(access, programSlug)) {
    return {ok: false as const, error: "Forbidden"};
  }
  await sql().query(`delete from program_sized_items where id = $1 and program_slug = $2`, [
    itemId,
    programSlug,
  ]);
  return {ok: true as const};
}

export function legacySizesFromRow(row: {
  jersey: string;
  short: string;
}): Record<string, string> {
  return {
    [LEGACY_JERSEY.id]: row.jersey,
    [LEGACY_SHORT.id]: row.short,
  };
}

export function defaultBackForName(name: string) {
  return rosterBackName(name);
}
