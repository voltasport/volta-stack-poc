import {cookies} from "next/headers";
import {allSchools, entityBySlug} from "@/lib/entities";
import {isAdmin} from "@/lib/session";

export async function currentEntity() {
  const jar = await cookies();
  const slug = jar.get("volta_entity")?.value;
  if (slug === allSchools.slug && (await isAdmin())) return allSchools;
  if (slug === allSchools.slug) return entityBySlug(undefined);
  return entityBySlug(slug);
}
