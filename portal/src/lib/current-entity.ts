import {getAccessContext, resolveCurrentEntity} from "@/lib/access";

/** @deprecated Prefer resolveCurrentEntity(access) from @/lib/access */
export async function currentEntity() {
  const access = await getAccessContext();
  if (!access) {
    const {entityBySlug} = await import("@/lib/entities");
    return entityBySlug(undefined);
  }
  return resolveCurrentEntity(access);
}
