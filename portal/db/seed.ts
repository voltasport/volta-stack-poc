import {readFileSync} from "node:fs";
import {neon} from "@neondatabase/serverless";
import {needsYou, programs, updates} from "../src/lib/data";

function databaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;
  const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = file.split("\n").find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL is not set");
  return line.slice("DATABASE_URL=".length).trim();
}

const sql = neon(databaseUrl());

async function main() {

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const statements = schema
  .split(/;\s*(?:\n|$)/)
  .map((statement) =>
    statement
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

await sql.query(`
  truncate table
    kit_items,
    roster_rows,
    milestones,
    proofs,
    files,
    tasks,
    updates,
    programs
  restart identity
`);

for (const [index, program] of programs.entries()) {
  await sql.query(
    `insert into programs (
      slug, name, line, meta, stage, status, filled, total, eyebrow, title,
      delivery_label, delivery_date, phase, week_note, week_author, ship_to, ship_note, sort_order
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18
    )`,
    [
      program.slug,
      program.name,
      program.line,
      program.meta,
      program.stage,
      program.status,
      program.filled,
      program.total,
      program.eyebrow,
      program.title,
      program.deliveryLabel,
      program.deliveryDate,
      program.phase,
      program.weekNote,
      program.weekAuthor,
      program.shipTo,
      program.shipNote,
      index,
    ],
  );

  for (const [itemIndex, item] of program.items.entries()) {
    await sql.query(
      `insert into kit_items (program_slug, name, qty, proof, status, sort_order)
       values ($1, $2, $3, $4, $5, $6)`,
      [program.slug, item.name, item.qty, item.proof, item.status, itemIndex],
    );
  }

  for (const [rowIndex, row] of program.roster.entries()) {
    await sql.query(
      `insert into roster_rows (
        program_slug, num, name, pos, jersey, short, back, submitted, sort_order
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [program.slug, row.num, row.name, row.pos, row.jersey, row.short, row.back, row.submitted, rowIndex],
    );
  }

  for (const [milestoneIndex, milestone] of program.milestones.entries()) {
    await sql.query(
      `insert into milestones (program_slug, label, date, state, sort_order)
       values ($1, $2, $3, $4, $5)`,
      [program.slug, milestone.label, milestone.date, milestone.state, milestoneIndex],
    );
  }

  for (const [proofIndex, proof] of program.proofs.entries()) {
    await sql.query(
      `insert into proofs (program_slug, version, date, note, current, sort_order)
       values ($1, $2, $3, $4, $5, $6)`,
      [program.slug, proof.version, proof.date, proof.note, Boolean(proof.current), proofIndex],
    );
  }

  for (const [fileIndex, file] of program.files.entries()) {
    await sql.query(
      `insert into files (program_slug, name, meta, sort_order) values ($1, $2, $3, $4)`,
      [program.slug, file.name, file.meta, fileIndex],
    );
  }
}

for (const [index, task] of needsYou.entries()) {
  await sql.query(
    `insert into tasks (href, title, detail, badge, sort_order) values ($1, $2, $3, $4, $5)`,
    [task.href, task.title, task.detail, task.badge, index],
  );
}

for (const [index, update] of updates.entries()) {
  await sql.query(
    `insert into updates (tone, text, when_label, sort_order) values ($1, $2, $3, $4)`,
    [update.tone, update.text, update.when, index],
  );
}

const counts = await sql.query(`
  select
    (select count(*) from programs) as programs,
    (select count(*) from roster_rows) as roster,
    (select count(*) from proofs) as proofs
`);
console.log(counts[0]);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exit(1);
});
