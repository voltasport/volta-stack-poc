import {headers} from "next/headers";
import {getAuth} from "@/lib/auth";

export async function currentSession() {
  return getAuth().api.getSession({headers: await headers()});
}

export async function isAdmin() {
  const session = await currentSession();
  return session?.user.role === "admin";
}
