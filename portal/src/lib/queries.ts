import type {Program, Status} from "@/lib/data";
import type {AccessContext} from "@/lib/access";
import {programFilterClause} from "@/lib/access";
import {sql} from "@/lib/db";
import {isMissingColumn} from "@/lib/db-errors";

type ProgramRow = {
  slug: string;
  school_slug: string;
  name: string;
  line: string;
  meta: string;
  stage: string;
  status: Status;
  filled: number;
  total: number;
  eyebrow: string;
  title: string;
  delivery_label: string;
  delivery_date: string;
  phase: string;
  week_note: string;
  week_author: string;
  ship_to: string;
  ship_note: string;
  items: Program["items"];
  roster: Program["roster"];
  milestones: Program["milestones"];
  proofs: Program["proofs"];
  files: Program["files"];
};

function toProgram(row: ProgramRow): Program {
  return {
    slug: row.slug,
    schoolSlug: row.school_slug,
    name: row.name,
    line: row.line,
    meta: row.meta,
    stage: row.stage,
    status: row.status,
    filled: row.filled,
    total: row.total,
    eyebrow: row.eyebrow,
    title: row.title,
    deliveryLabel: row.delivery_label,
    deliveryDate: row.delivery_date,
    phase: row.phase,
    weekNote: row.week_note,
    weekAuthor: row.week_author,
    shipTo: row.ship_to,
    shipNote: row.ship_note,
    items: row.items ?? [],
    roster: row.roster ?? [],
    milestones: row.milestones ?? [],
    proofs: row.proofs ?? [],
    files: row.files ?? [],
  };
}

const programQuery = `
  select
    p.slug,
    p.school_slug,
    p.name,
    p.line,
    p.meta,
    p.stage,
    p.status,
    p.filled,
    p.total,
    p.eyebrow,
    p.title,
    p.delivery_label,
    p.delivery_date,
    p.phase,
    p.week_note,
    p.week_author,
    p.ship_to,
    p.ship_note,
    coalesce(items.items, '[]'::json) as items,
    coalesce(roster.roster, '[]'::json) as roster,
    coalesce(milestones.milestones, '[]'::json) as milestones,
    coalesce(proofs.proofs, '[]'::json) as proofs,
    coalesce(files.files, '[]'::json) as files
  from programs p
  left join lateral (
    select json_agg(json_build_object(
      'name', name, 'qty', qty, 'proof', proof, 'status', status
    ) order by sort_order) as items
    from kit_items
    where program_slug = p.slug
  ) items on true
  left join lateral (
    select json_agg(json_build_object(
      'id', id, 'num', num, 'name', name, 'pos', pos, 'jersey', jersey,
      'short', short, 'back', back, 'submitted', submitted
    ) order by sort_order) as roster
    from roster_rows
    where program_slug = p.slug
  ) roster on true
  left join lateral (
    select json_agg(json_build_object(
      'label', label, 'date', date, 'state', state
    ) order by sort_order) as milestones
    from milestones
    where program_slug = p.slug
  ) milestones on true
  left join lateral (
    select json_agg(json_build_object(
      'version', version, 'date', date, 'note', note, 'current', current
    ) order by sort_order) as proofs
    from proofs
    where program_slug = p.slug
  ) proofs on true
  left join lateral (
    select json_agg(json_build_object('name', name, 'meta', meta) order by sort_order) as files
    from files
    where program_slug = p.slug
  ) files on true
  where true
`;

const legacyProgramQuery = programQuery.replace(
  "p.school_slug,",
  "'slcc'::text as school_slug,",
);

async function fetchProgramRows(text: string, params: unknown[]) {
  try {
    return (await sql().query(text, params)) as ProgramRow[];
  } catch (error) {
    if (!isMissingColumn(error, "school_slug")) throw error;
    const legacyText = text.replace(programQuery, legacyProgramQuery).replace(
      / and p\.school_slug = \$\d+/g,
      "",
    );
    const legacyParams =
      params.length > 0 && text.includes("school_slug") ? params.slice(0, -1) : params;
    return (await sql().query(legacyText, legacyParams)) as ProgramRow[];
  }
}

export async function getPrograms(access: AccessContext, schoolSlug?: string) {
  const filter = programFilterClause(1, access);
  let clause = filter.clause;
  const params = [...filter.params];
  if (schoolSlug && schoolSlug !== "all") {
    clause += ` and p.school_slug = $${params.length + 1}`;
    params.push(schoolSlug);
  }
  const rows = await fetchProgramRows(programQuery + clause + " order by p.sort_order", params);
  return rows.map(toProgram);
}

export async function getProgram(access: AccessContext, slug: string) {
  const filter = programFilterClause(2, access);
  const rows = await fetchProgramRows(programQuery + " and p.slug = $1" + filter.clause, [
    slug,
    ...filter.params,
  ]);
  const row = rows[0];
  return row ? toProgram(row) : undefined;
}

export async function getProgramSlugs(access: AccessContext): Promise<string[]> {
  if (access.programSlugs) return access.programSlugs;
  const rows = (await sql().query(`select slug from programs order by sort_order`)) as {slug: string}[];
  return rows.map((row) => row.slug);
}

export async function getTasks(access: AccessContext) {
  if (!access.canSeeAllSchools) {
    if (!access.programSlugs || access.programSlugs.length === 0) {
      return [];
    }
  }
  try {
    const rows = access.canSeeAllSchools
      ? await sql().query(
          `select href, title, detail, badge, program_slug from tasks order by sort_order`,
        )
      : await sql().query(
          `select href, title, detail, badge, program_slug from tasks
           where program_slug is not null
             and program_slug = any($1::text[])
           order by sort_order`,
          [access.programSlugs],
        );
    return rows as {
      href: string;
      title: string;
      detail: string;
      badge: "check" | "4" | "doc";
      program_slug: string | null;
    }[];
  } catch (error) {
    if (isMissingColumn(error, "program_slug")) {
      if (!access.canSeeAllSchools) return [];
      const rows = await sql().query(`select href, title, detail, badge from tasks order by sort_order`);
      return rows as {
        href: string;
        title: string;
        detail: string;
        badge: "check" | "4" | "doc";
        program_slug: string | null;
      }[];
    }
    throw error;
  }
}

export async function getUpdates(access: AccessContext) {
  if (!access.canSeeAllSchools) {
    if (!access.programSlugs || access.programSlugs.length === 0) {
      return [];
    }
  }
  const rows = await sql()`
    select tone, text, when_label
    from updates
    order by sort_order
  `;
  const all = (rows as {tone: "live" | "idle"; text: string; when_label: string}[]).map((row) => ({
    tone: row.tone,
    text: row.text,
    when: row.when_label,
  }));
  if (access.canSeeAllSchools) return all;
  return [];
}

export function isPlaceholderProgram(row: {slug: string; name: string}) {
  return row.slug === "next-program" || row.name.startsWith("[");
}

export async function listProgramsForAdminPicker() {
  const rows = await listProgramsForAdmin();
  return rows.filter((row) => !isPlaceholderProgram(row));
}

export async function listProgramsForAdmin() {
  const rows = (await sql().query(
    `select slug, name, school_slug from programs order by sort_order`,
  )) as {slug: string; name: string; school_slug: string}[];
  return rows.filter((row) => !isPlaceholderProgram(row));
}

export async function listPortalUsers() {
  const rows = (await sql().query(
    `select id, name, email, role from "user" order by email`,
  )) as {id: string; name: string; email: string; role: string}[];
  return rows;
}

export async function getUserAssignments(userId: string) {
  const rows = (await sql().query(
    `select program_slug from user_program_assignments where user_id = $1 order by program_slug`,
    [userId],
  )) as {program_slug: string}[];
  return rows.map((row) => row.program_slug);
}

export async function setUserAssignments(userId: string, programSlugs: string[]) {
  await sql().query(`delete from user_program_assignments where user_id = $1`, [userId]);
  for (const programSlug of programSlugs) {
    await sql().query(
      `insert into user_program_assignments (user_id, program_slug) values ($1, $2)`,
      [userId, programSlug],
    );
  }
}

export async function setUserRole(userId: string, role: string) {
  await sql().query(`update "user" set role = $2, "updatedAt" = now() where id = $1`, [userId, role]);
}
