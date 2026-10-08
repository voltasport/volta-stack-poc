import type {AccessContext} from "@/lib/access";
import type {Program, ProgramSizedItem, RosterRow} from "@/lib/data";
import {
  computeProgramWeekNote,
  kitSizesReady,
  legacySizedItems,
  LEGACY_JERSEY_ID,
  LEGACY_SHORT_ID,
  loadRosterSizes,
  missingSizesByProgram,
} from "@/lib/program-kit-items";
import {normalizeSizeValue, rowSizesComplete} from "@/lib/roster-utils";

function legacyRowSizes(row: RosterRow): Record<number, string> {
  const sizes: Record<number, string> = {};
  if (row.jersey && row.jersey !== "—") sizes[LEGACY_JERSEY_ID] = row.jersey;
  if (row.short && row.short !== "—") sizes[LEGACY_SHORT_ID] = row.short;
  return sizes;
}

function enrichWith(
  program: Program,
  ready: boolean,
  sizeMap: Map<number, Record<number, string>>,
): Program {
  const sizedItems: ProgramSizedItem[] = ready
    ? program.items
        .filter((item) => item.id !== undefined && (item.sizeOptions?.length ?? 0) > 0)
        .map((item, index) => ({
          id: item.id!,
          name: item.name,
          sizeOptions: item.sizeOptions ?? [],
          sortOrder: index,
        }))
    : legacySizedItems();

  const roster = program.roster.map((row) => {
    const stored = ready ? (row.id ? sizeMap.get(Number(row.id)) ?? {} : {}) : legacyRowSizes(row);
    const sizesByItemId: Record<number, string> = {};
    for (const item of sizedItems) {
      const value = stored[item.id];
      if (value) sizesByItemId[item.id] = normalizeSizeValue(value, item.sizeOptions) ?? value;
    }
    return {...row, sizesByItemId, submitted: rowSizesComplete(sizedItems, sizesByItemId)};
  });

  const missingSizes = roster.filter((row) => !row.submitted).length;
  return {
    ...program,
    sizedItems,
    sizesReady: ready,
    roster,
    displayWeekNote: computeProgramWeekNote({
      rosterCount: roster.length,
      missingSizes,
      sizedItemCount: sizedItems.length,
    }),
  };
}

/** Attach sized items and per-item roster sizes (two queries total, regardless of program count). */
export async function enrichPrograms(programs: Program[]) {
  if (programs.length === 0) return programs;
  const ready = await kitSizesReady();
  const sizeMap = ready ? await loadRosterSizes(programs.map((program) => program.slug)) : new Map();
  return programs.map((program) => enrichWith(program, ready, sizeMap));
}

export async function enrichProgram(program: Program) {
  const [enriched] = await enrichPrograms([program]);
  return enriched!;
}

export async function buildMissingSizesTasks(access: AccessContext) {
  const rows = await missingSizesByProgram(access.canSeeAllSchools ? null : access.programSlugs ?? []);
  return rows.map((row) => ({
    href: `/programs/${row.slug}?tab=roster`,
    title: `${row.missing} athlete${row.missing === 1 ? "" : "s"} missing sizes`,
    detail: `${row.name} · complete all kit sizes`,
    badge: "4" as const,
    program_slug: row.slug as string | null,
  }));
}
