import type {Program, Status} from "@/lib/data";
import {sql} from "@/lib/db";

type ProgramRow = {
  slug: string;
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
      'num', num, 'name', name, 'pos', pos, 'jersey', jersey,
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
`;

export async function getPrograms() {
  const rows = await sql().query(programQuery + " order by p.sort_order");
  return (rows as ProgramRow[]).map(toProgram);
}

export async function getProgram(slug: string) {
  const rows = await sql().query(programQuery + " where p.slug = $1", [slug]);
  const row = (rows as ProgramRow[])[0];
  return row ? toProgram(row) : undefined;
}

export async function getTasks() {
  const rows = await sql()`
    select href, title, detail, badge
    from tasks
    order by sort_order
  `;
  return rows as {href: string; title: string; detail: string; badge: "check" | "4" | "doc"}[];
}

export async function getUpdates() {
  const rows = await sql()`
    select tone, text, when_label
    from updates
    order by sort_order
  `;
  return (rows as {tone: "live" | "idle"; text: string; when_label: string}[]).map((row) => ({
    tone: row.tone,
    text: row.text,
    when: row.when_label,
  }));
}
