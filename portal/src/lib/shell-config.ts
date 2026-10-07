import type {AccessContext} from "@/lib/access";
import {buildNav} from "@/lib/shell-nav";
import {allSchools, type CatalogEntity} from "@/lib/entities";

export type ShellConfig = {
  nav: ReturnType<typeof buildNav>;
  entityChoices: CatalogEntity[];
  defaultEntitySlug: string;
  showAdminActions: boolean;
};

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

  const entityChoices = access.canSeeAllSchools ? [allSchools, ...access.entities] : access.entities;

  return {
    nav,
    entityChoices,
    defaultEntitySlug: entity.slug,
    showAdminActions: access.showAdminActions,
  };
}
