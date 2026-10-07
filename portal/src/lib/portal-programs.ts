import {randomBytes} from "node:crypto";
import type {AccessContext} from "@/lib/access";
import {sql} from "@/lib/db";

export type CreateProgramInput = {
  name: string;
  sport: string;
  levelOrSeason: string;
  rosterSize?: number | null;
  schoolSlug?: string;
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

  const schoolSlug = (input.schoolSlug?.trim() || "other").slice(0, 48);
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
      "TBD",
      "Address added at kickoff",
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

export type ParsedRosterLine = {num: string; name: string; pos: string};

export function parseRosterImport(text: string): ParsedRosterLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("name") || header.includes("number") || header.includes("num");
  const body = hasHeader ? lines.slice(1) : lines;

  const out: ParsedRosterLine[] = [];
  for (const line of body) {
    const cols = line.split(/[,;\t]/).map((c) => c.trim());
    if (cols.length >= 2) {
      out.push({
        num: cols[0] || String(out.length + 1),
        name: cols[1] || "Athlete",
        pos: cols[2] || "—",
      });
    } else {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        out.push({num: parts[0], name: parts.slice(1).join(" "), pos: "—"});
      }
    }
  }
  return out.slice(0, 500);
}

export async function assertCanEditProgramRoster(access: AccessContext, programSlug: string) {
  if (access.role === "admin") return true;
  if (access.programSlugs === null) return false;
  return access.programSlugs.includes(programSlug);
}

export async function importRosterLines(
  access: AccessContext,
  programSlug: string,
  lines: ParsedRosterLine[],
  mode: "append" | "replace",
) {
  if (!(await assertCanEditProgramRoster(access, programSlug))) {
    return {ok: false as const, error: "Forbidden"};
  }
  if (lines.length === 0) {
    return {ok: false as const, error: "Add at least one player."};
  }

  if (mode === "replace") {
    await sql().query(`delete from roster_rows where program_slug = $1`, [programSlug]);
  }

  const existing = (await sql().query(
    `select coalesce(max(sort_order), -1) as max from roster_rows where program_slug = $1`,
    [programSlug],
  )) as {max: number}[];
  let sort = (existing[0]?.max ?? -1) + 1;

  for (const row of lines) {
    await sql().query(
      `insert into roster_rows (
        program_slug, num, name, pos, jersey, short, back, submitted, sort_order
      ) values ($1, $2, $3, $4, '—', '—', $4, false, $5)`,
      [programSlug, row.num, row.name, row.pos, sort++],
    );
  }

  return {ok: true as const, count: lines.length};
}

export async function upsertRosterPlayer(
  access: AccessContext,
  programSlug: string,
  input: {num: string; name: string; pos: string; rowId?: number},
) {
  if (!(await assertCanEditProgramRoster(access, programSlug))) {
    return {ok: false as const, error: "Forbidden"};
  }
  const num = input.num.trim();
  const name = input.name.trim();
  const pos = input.pos.trim() || "—";
  if (!num || !name) {
    return {ok: false as const, error: "Number and name are required."};
  }

  if (input.rowId) {
    await sql().query(
      `update roster_rows set num = $2, name = $3, pos = $4, back = $4 where id = $1 and program_slug = $5`,
      [input.rowId, num, name, pos, programSlug],
    );
    return {ok: true as const};
  }

  const existing = (await sql().query(
    `select coalesce(max(sort_order), -1) as max from roster_rows where program_slug = $1`,
    [programSlug],
  )) as {max: number}[];
  const sort = (existing[0]?.max ?? -1) + 1;
  await sql().query(
    `insert into roster_rows (
      program_slug, num, name, pos, jersey, short, back, submitted, sort_order
    ) values ($1, $2, $3, $4, '—', '—', $4, false, $5)`,
    [programSlug, num, name, pos, sort],
  );
  return {ok: true as const};
}
