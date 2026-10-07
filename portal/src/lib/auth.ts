import {Pool as NeonPool, neonConfig} from "@neondatabase/serverless";
import {betterAuth} from "better-auth";
import {admin} from "better-auth/plugins";
import {Pool as PgPool} from "pg";
import ws from "ws";
import {sendResetPasswordEmail} from "@/lib/email/password-reset-mailer";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

function resolveAuthSecret(): string | undefined {
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

function isLocalPostgres(url: string) {
  return /localhost|127\.0\.0\.1/.test(url);
}

function database() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  if (isLocalPostgres(connectionString)) {
    return new PgPool({connectionString});
  }
  return new NeonPool({connectionString});
}

function createAuth() {
  const secret = resolveAuthSecret();
  assertRuntimeSecret(secret);
  return betterAuth({
    database: database(),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      sendResetPassword: async ({user, url}) => {
        await sendResetPasswordEmail({
          email: user.email,
          name: user.name ?? user.email,
          url,
        });
      },
    },
    plugins: [
      admin({
        adminRoles: ["admin"],
        defaultRole: "director",
      }),
    ],
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "director",
          input: false,
        },
      },
    },
    secret,
    baseURL: resolveAuthBaseURL(),
    rateLimit: {
      enabled:
        process.env.NODE_ENV === "production" &&
        !/localhost|127\.0\.0\.1/.test(process.env["DATABASE_URL"] ?? ""),
      storage: "database",
      modelName: "rateLimit",
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  auth ??= createAuth();
  return auth;
}
