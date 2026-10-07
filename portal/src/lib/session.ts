import {headers} from "next/headers";
import {getAuth} from "@/lib/auth";
import {sql} from "@/lib/db";
import {isMissingColumn} from "@/lib/db-errors";
import {parsePortalRole, type PortalRole} from "@/lib/roles";

export async function currentSession() {
  return getAuth().api.getSession({headers: await headers()});
}

/** Session JWT role can be stale; DB `user.role` is source of truth after seed/admin updates. */
export async function resolvePortalRole(
  userId: string,
  sessionRole: string | undefined,
): Promise<PortalRole> {
  try {
    const rows = (await sql().query(`select role from "user" where id = $1`, [userId])) as {
      role: string | null;
    }[];
    const fromDb = rows[0]?.role;
    if (fromDb) return parsePortalRole(fromDb);
  } catch (error) {
    if (!isMissingColumn(error, "role")) throw error;
  }
  return parsePortalRole(sessionRole);
}

export async function currentRole(): Promise<PortalRole | null> {
  const session = await currentSession();
  if (!session?.user) return null;
  return resolvePortalRole(session.user.id, session.user.role as string | undefined);
}

export async function isAdmin() {
  const role = await currentRole();
  return role === "admin";
}
