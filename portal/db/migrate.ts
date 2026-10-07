import {readdirSync, readFileSync} from "node:fs";
import {Pool} from "pg";
import {neon} from "@neondatabase/serverless";

function databaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;
  const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = file.split("\n").find((entry) => entry.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL is not set");
  return line.slice("DATABASE_URL=".length).trim();
}

function createSql() {
  const url = databaseUrl();
  if (/localhost|127\.0\.0\.1/.test(url)) {
    const pool = new Pool({connectionString: url});
    return {
      query: (text: string) => pool.query(text).then((result) => result.rows),
    };
  }
  return neon(url);
}

async function main() {
  const dir = new URL("./migrations/", import.meta.url);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = createSql();
  for (const file of files) {
    const body = readFileSync(new URL(file, dir), "utf8");
    const statements = body
      .split(/;\s*(?:\n|$)/)
      .map((statement) =>
        statement
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim(),
      )
      .filter(Boolean);
    console.log(`Applying ${file}…`);
    for (const statement of statements) {
      await sql.query(statement);
    }
  }
  console.log("Migrations complete.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exit(1);
});
