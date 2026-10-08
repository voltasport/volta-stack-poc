import type {Program, RosterRow} from "@/lib/data";
import type {AccessContext} from "@/lib/access";
import {
  computeProgramWeekNote,
  ensureDefaultSizedItems,
  legacySizedItemsForProgram,
  loadProgramSizedItems,
  loadRosterRowSizeMap,
  programSizedItemsTableReady,
  rowSizesComplete,
} from "@/lib/program-sized-items";
import {rosterRowSubmitted} from "@/lib/roster-utils";

export async function enrichProgram(program: Program): Promise<Program> {
  const tableReady = await programSizedItemsTableReady();
  if (!tableReady) {
    const legacyItems = legacySizedItemsForProgram().map((item, index) => ({
      id: index + 1,
      name: item.name,
      sizeOptions: item.sizeOptions,
      sortOrder: index,
    }));
    const roster = program.roster.map((row) => enrichLegacyRosterRow(row));
    const missingSizes = roster.filter((row) => !row.submitted).length;
    return {
      ...program,
      sizedItems: legacyItems,
      roster,
      displayWeekNote: computeProgramWeekNote({
        rosterCount: roster.length,
        missingSizes,
        sizedItemCount: legacyItems.length,
      }),
    };
  }

  let sizedItems = await loadProgramSizedItems(program.slug);
  if (sizedItems.length === 0) {
    await ensureDefaultSizedItems(program.slug);
    sizedItems = await loadProgramSizedItems(program.slug);
  }
  const sizeMap = await loadRosterRowSizeMap(program.slug);
  const roster = program.roster.map((row) => {
    if (!row.id) return row;
    const values = {...(sizeMap.get(row.id) ?? {})};
    for (const item of sizedItems) {
      if (values[item.id]) continue;
      if (item.name.toLowerCase() === "jersey" && row.jersey && row.jersey !== "—") {
        values[item.id] = row.jersey;
      }
      if (item.name.toLowerCase() === "short" && row.short && row.short !== "—") {
        values[item.id] = row.short;
      }
    }
    const sizesByItemId: Record<number, string> = {};
    for (const item of sizedItems) {
      if (values[item.id]) sizesByItemId[item.id] = values[item.id];
    }
    const submitted = rowSizesComplete(sizedItems, sizesByItemId);
    return {...row, sizesByItemId, submitted};
  });

  const missingSizes = roster.filter((row) => !row.submitted).length;
  return {
    ...program,
    sizedItems: sizedItems.map((item) => ({
      id: item.id,
      name: item.name,
      sizeOptions: item.sizeOptions,
      sortOrder: item.sortOrder,
    })),
    roster,
    displayWeekNote: computeProgramWeekNote({
      rosterCount: roster.length,
      missingSizes,
      sizedItemCount: sizedItems.length,
    }),
  };
}

function enrichLegacyRosterRow(row: RosterRow): RosterRow {
  const submitted = rosterRowSubmitted(row.jersey, row.short, row.back);
  return {
    ...row,
    submitted,
    sizesByItemId: {
      1: row.jersey,
      2: row.short,
    },
  };
}

export async function enrichPrograms(programs: Program[]) {
  return Promise.all(programs.map((program) => enrichProgram(program)));
}

export async function buildMissingSizesTasks(access: AccessContext) {
  const tableReady = await programSizedItemsTableReady();
  if (!tableReady) return [] as {
    href: string;
    title: string;
    detail: string;
    badge: "4";
    program_slug: string;
  }[];

  if (!access.canSeeAllSchools && (!access.programSlugs || access.programSlugs.length === 0)) {
    return [];
  }

  const {sql} = await import("@/lib/db");
  const slugFilter = access.canSeeAllSchools
    ? ""
    : " and p.slug = any($1::text[])";
  const params = access.canSeeAllSchools ? [] : [access.programSlugs];

  const rows = (await sql().query(
    `select p.slug, p.name,
            count(r.id)::int as roster_count,
            count(r.id) filter (where not r.submitted)::int as missing_count
     from programs p
     join roster_rows r on r.program_slug = p.slug
     where exists (select 1 from program_sized_items i where i.program_slug = p.slug)
     ${slugFilter}
     group by p.slug, p.name
     having count(r.id) filter (where not r.submitted) > 0`,
    params,
  )) as {slug: string; name: string; missing_count: number}[];

  return rows.map((row) => ({
    href: `/programs/${row.slug}?tab=roster`,
    title: `${row.missing_count} athlete${row.missing_count === 1 ? "" : "s"} missing sizes`,
    detail: `${row.name} · complete all kit sizes`,
    badge: "4" as const,
    program_slug: row.slug,
  }));
}
