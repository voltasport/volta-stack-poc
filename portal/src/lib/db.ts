import {neon} from "@neondatabase/serverless";
import {Pool as PgPool} from "pg";

export type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  query: (text: string, params?: unknown[]) => Promise<unknown[]>;
};

let client: SqlClient | undefined;

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
    client = isLocalPostgres(url) ? wrapPg(new PgPool({connectionString: url})) : (neon(url) as SqlClient);
  }
  return client;
}
