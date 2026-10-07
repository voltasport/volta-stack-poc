import {readFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
import {hashPassword} from "better-auth/crypto";
import {neon} from "@neondatabase/serverless";
import {Pool} from "pg";

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
      query: (text: string, params?: unknown[]) =>
        pool.query(text, params).then((result: {rows: unknown[]}) => result.rows),
    };
  }
  return neon(url);
}

function id(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

async function upsertUser(
  sql: ReturnType<typeof createSql>,
  input: {email: string; name: string; role: string; password: string; programs: string[]},
) {
  const existing = (await sql.query(`select id from "user" where lower(email) = lower($1)`, [
    input.email,
  ])) as {id: string}[];
  const userId = existing[0]?.id ?? id("usr");
  const hashed = await hashPassword(input.password);

  if (existing[0]) {
    await sql.query(
      `update "user" set name = $2, role = $3, "updatedAt" = now() where id = $1`,
      [userId, input.name, input.role],
    );
  } else {
    await sql.query(
      `insert into "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
       values ($1, $2, $3, true, $4, now(), now())`,
      [userId, input.name, input.email, input.role],
    );
  }

  const accounts = (await sql.query(
    `select id from account where "userId" = $1 and "providerId" = 'credential'`,
    [userId],
  )) as {id: string}[];
  if (accounts[0]) {
    await sql.query(`update account set password = $2, "updatedAt" = now() where id = $1`, [
      accounts[0].id,
      hashed,
    ]);
  } else {
    await sql.query(
      `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $3, $4, now(), now())`,
      [id("acc"), userId, userId, hashed],
    );
  }

  await sql.query(
    `update account set "accountId" = $2, "updatedAt" = now()
     where "userId" = $1 and "providerId" = 'credential' and "accountId" <> $2`,
    [userId, userId],
  );

  await sql.query(`delete from user_program_assignments where user_id = $1`, [userId]);
  for (const programSlug of input.programs) {
    await sql.query(
      `insert into user_program_assignments (user_id, program_slug) values ($1, $2)
       on conflict do nothing`,
      [userId, programSlug],
    );
  }
}

async function main() {
  const sql = createSql();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "VoltaAdmin123!";
  const directorPassword = process.env.SEED_DIRECTOR_PASSWORD ?? "director-test-12";
  const managerPassword = process.env.SEED_MANAGER_PASSWORD ?? "manager-test-12";

  await upsertUser(sql, {
    email: "admin@voltasport.co",
    name: "Volta Admin",
    role: "admin",
    password: adminPassword,
    programs: [],
  });

  await upsertUser(sql, {
    email: "director@test.local",
    name: "Test Director",
    role: "director",
    password: directorPassword,
    programs: ["cross-country", "womens-soccer", "mens-soccer"],
  });

  await upsertUser(sql, {
    email: "manager@test.local",
    name: "Test Manager",
    role: "manager",
    password: managerPassword,
    programs: ["davis-varsity"],
  });

  console.log("Seeded portal users (local/dev only).");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "User seed failed");
  process.exit(1);
});
