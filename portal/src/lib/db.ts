import {neon} from "@neondatabase/serverless";
import {Pool as PgPool} from "pg";

export type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  query: (text: string, params?: unknown[]) => Promise<unknown[]>;
};

let client: SqlClient | undefined;
let pgPool: PgPool | undefined;
let neonClient: ReturnType<typeof neon> | undefined;

function isLocalPostgres(url: string) {
  return /localhost|127\.0\.0\.1/.test(url);
}

function wrapPg(pool: PgPool): SqlClient {
  const fn = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i++) {
      text += `$${i + 1}${strings[i + 1] ?? ""}`;
    }
    return pool.query(text, values).then((result) => result.rows);
  };
  fn.query = (text: string, params?: unknown[]) =>
    pool.query(text, params).then((result) => result.rows);
  return fn;
}

export function sql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!client) {
    if (isLocalPostgres(url)) {
      pgPool = new PgPool({connectionString: url});
      client = wrapPg(pgPool);
    } else {
      neonClient = neon(url);
      client = neonClient as unknown as SqlClient;
    }
  }
  return client;
}

export type SqlStatement = {text: string; params?: unknown[]};

/** Run statements atomically: all succeed or none are applied. */
export async function sqlTransaction(statements: SqlStatement[]): Promise<void> {
  if (statements.length === 0) return;
  sql();
  if (pgPool) {
    const conn = await pgPool.connect();
    try {
      await conn.query("begin");
      for (const statement of statements) {
        await conn.query(statement.text, statement.params);
      }
      await conn.query("commit");
    } catch (error) {
      await conn.query("rollback").catch(() => {});
      throw error;
    } finally {
      conn.release();
    }
    return;
  }
  const neonSql = neonClient!;
  await neonSql.transaction(
    statements.map((statement) => neonSql.query(statement.text, statement.params ?? [])),
  );
}
