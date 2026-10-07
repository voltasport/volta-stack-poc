import {headers} from "next/headers";
import {getAuth} from "@/lib/auth";
import {sql} from "@/lib/db";
import {currentSession} from "@/lib/session";

function baseUrl() {
  return process.env["BETTER_AUTH_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

async function requireAdminSession() {
  const session = await currentSession();
  if (session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createPortalUser(input: {
  email: string;
  name: string;
  role: string;
  password?: string;
}) {
  await requireAdminSession();
  const auth = getAuth();
  const tempPassword = input.password ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const result = await auth.api.createUser({
    body: {
      email: input.email,
      name: input.name,
      password: tempPassword,
    },
    headers: await headers(),
  });
  await sql().query(`update "user" set role = $2, "updatedAt" = now() where id = $1`, [
    result.user.id,
    input.role,
  ]);
  return {user: {...result.user, role: input.role}};
}

export async function generatePasswordResetLink(email: string) {
  await requireAdminSession();
  const auth = getAuth();
  const redirectTo = `${baseUrl()}/reset-password`;
  await auth.api.requestPasswordReset({
    body: {email, redirectTo},
    headers: await headers(),
  });
  const rows = (await sql().query(
    `select identifier from verification
     where identifier like 'reset-password:%'
     order by "createdAt" desc
     limit 1`,
  )) as {identifier: string}[];
  const identifier = rows[0]?.identifier;
  if (!identifier) {
    throw new Error("Could not create reset link. Check that the user exists.");
  }
  const token = identifier.replace("reset-password:", "");
  const params = new URLSearchParams({
    callbackURL: "/",
    email,
  });
  return `${baseUrl()}/reset-password/${token}?${params.toString()}`;
}
