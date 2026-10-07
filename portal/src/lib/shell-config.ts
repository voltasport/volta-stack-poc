import type {AccessContext} from "@/lib/access";
import {buildNav} from "@/lib/shell-nav";
import {allSchools, type CatalogEntity} from "@/lib/entities";

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
  programCount: number,
  needsYouCount: number,
  rosterProgramSlug?: string,
): ShellConfig {
  const rosterHref = rosterProgramSlug
    ? `/programs/${rosterProgramSlug}?tab=roster`
    : "/programs";
  const nav = buildNav(access, programCount, needsYouCount).map((item) =>
    item.match === "roster" ? {...item, href: rosterHref} : item,
  );

  const entityChoices = (access.canSeeAllSchools ? [allSchools, ...access.entities] : access.entities).map(
    toShellEntity,
  );

  return {
    nav,
    entityChoices,
    defaultEntitySlug: entity.slug,
    showAdminActions: access.showAdminActions,
  };
}
