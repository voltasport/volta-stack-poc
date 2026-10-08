import {execSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function shouldRunMigrations() {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return true;
  if (vercelEnv === "preview" && process.env.DATABASE_URL) return true;
  return false;
}

if (shouldRunMigrations()) {
  console.log(`Running db:migrate before build (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})…`);
  execSync("npm run db:migrate", {stdio: "inherit", cwd: portalRoot, env: process.env});
} else {
  const hasDb = Boolean(process.env.DATABASE_URL);
  console.log(
    `Skipping db:migrate (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}, DATABASE_URL ${hasDb ? "set" : "unset"})`,
  );
}

console.log("Running next build…");
execSync("npm run build", {stdio: "inherit", cwd: portalRoot, env: process.env});
