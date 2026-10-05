import {Pool, neonConfig} from "@neondatabase/serverless";
import {betterAuth} from "better-auth";
import ws from "ws";

// Node 20 has no global WebSocket. Vercel's Node 24 does, so this only
// matters for local scripts and `next dev` on older Node.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

function resolveAuthSecret(): string | undefined {
  // Dynamic key access avoids build-time inlining of undefined when the var is
  // a Vercel Sensitive/Secret env (not present during `next build`).
  return process.env["BETTER_AUTH_SECRET"];
}

function resolveAuthBaseURL(): string | undefined {
  return process.env["BETTER_AUTH_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"];
}

function assertRuntimeSecret(secret: string | undefined): void {
  const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (!secret && process.env.NODE_ENV === "production" && !isNextProductionBuild) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Refusing to start with better-auth's insecure default signing key in production.",
    );
  }
}

function database() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({connectionString});
}

function createAuth() {
  const secret = resolveAuthSecret();
  assertRuntimeSecret(secret);
  return betterAuth({
    database: database(),
    emailAndPassword: {
      enabled: true,
    },
    secret,
    baseURL: resolveAuthBaseURL(),
    rateLimit: {
      enabled: process.env.NODE_ENV === "production",
      storage: "database",
      modelName: "rateLimit",
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

/** Better Auth instance. Pages stay public; nothing redirects to a login screen. */
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
