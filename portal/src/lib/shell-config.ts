import type {AccessContext} from "@/lib/access";
import {buildNav} from "@/lib/shell-nav";
import {allSchools, type CatalogEntity} from "@/lib/entities";
import type {ShellMetrics} from "@/lib/shell-metrics";

/** Serializable subset for the client Shell (no RegExp). */
export type ShellEntity = Pick<CatalogEntity, "slug" | "name" | "short" | "programs">;

export type ShellConfig = {
  nav: ReturnType<typeof buildNav>;
  entityChoices: ShellEntity[];
  defaultEntitySlug: string;
  showAdminActions: boolean;
};

function toShellEntity(entity: CatalogEntity): ShellEntity {
  return {
    slug: entity.slug,
    name: entity.name,
    short: entity.short,
    programs: entity.programs,
  };
}

export function createShellConfig(
  access: AccessContext,
  entity: CatalogEntity,
  metrics: ShellMetrics,
): ShellConfig {
  const nav = buildNav(access, metrics.programCount, metrics.approvalCount);

  const entityChoices: ShellEntity[] = [];
  const seen = new Set<string>();
  const push = (entry: CatalogEntity) => {
    if (seen.has(entry.slug)) return;
    seen.add(entry.slug);
    entityChoices.push(toShellEntity(entry));
  };
  if (access.canSeeAllSchools) push(allSchools);
  for (const entry of access.entities) push(entry);

  return {
    nav,
    entityChoices,
    defaultEntitySlug: entity.slug,
    showAdminActions: access.showAdminActions,
  };
}
