import {headers} from "next/headers";
import {getAuth} from "@/lib/auth";
import {parsePortalRole, type PortalRole} from "@/lib/roles";

export async function currentSession() {
  return getAuth().api.getSession({headers: await headers()});
}

export async function currentRole(): Promise<PortalRole | null> {
  const session = await currentSession();
  if (!session?.user) return null;
  return parsePortalRole(session.user.role as string | undefined);
}

export async function isAdmin() {
  const role = await currentRole();
  return role === "admin";
}
