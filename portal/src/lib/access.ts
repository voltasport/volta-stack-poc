import {cookies} from "next/headers";
import {notFound, redirect} from "next/navigation";
import {
  allSchools,
  entityBySlug,
  pendingSchool,
  sidebarSchoolEntities,
  type CatalogEntity,
} from "@/lib/entities";
import {sql} from "@/lib/db";
import {isMissingTable} from "@/lib/db-errors";
import {type PortalRole} from "@/lib/roles";
import {loadOnboardingDismissed, touchFirstLogin} from "@/lib/portal-invites";
import {currentSession, resolvePortalRole} from "@/lib/session";

export type AccessContext = {
  userId: string;
  role: PortalRole;
  email: string;
  name: string;
  /** null = unrestricted (admin). */
  programSlugs: string[] | null;
  schoolSlugs: string[] | null;
  entities: CatalogEntity[];
  canSeeAllSchools: boolean;
  showAdminActions: boolean;
  showApprovals: boolean;
  showArtworkLocker: boolean;
  showUsersNav: boolean;
  showCreateProgram: boolean;
  showOnboardingChecklist: boolean;
  /** True when assignment table is missing — login works; run db:migrate for scoping. */
  preMigrationMode: boolean;
};

async function loadProgramSlugs(userId: string): Promise<{slugs: string[]; preMigration: boolean}> {
  try {
    const rows = (await sql().query(
      `select program_slug from user_program_assignments where user_id = $1 order by program_slug`,
      [userId],
    )) as {program_slug: string}[];
    return {slugs: rows.map((row) => row.program_slug), preMigration: false};
  } catch (error) {
    if (isMissingTable(error, "user_program_assignments")) {
      return {slugs: [], preMigration: true};
    }
    throw error;
  }
}

async function loadSchoolSlugsForPrograms(programSlugs: string[]): Promise<string[]> {
  if (programSlugs.length === 0) return [];
  const rows = (await sql().query(
    `select distinct school_slug from programs where slug = any($1::text[]) order by school_slug`,
    [programSlugs],
  )) as {school_slug: string}[];
  return rows.map((row) => row.school_slug);
}

export async function getAccessContext(): Promise<AccessContext | null> {
  const session = await currentSession();
  if (!session?.user) return null;

  const userId = session.user.id;
  const role = await resolvePortalRole(userId, session.user.role as string | undefined);
  const email = session.user.email;
  const name = session.user.name ?? email;
  await touchFirstLogin(userId);
  const onboardingDismissed = await loadOnboardingDismissed(userId);

  if (role === "admin") {
    return {
      userId,
      role,
      email,
      name,
      programSlugs: null,
      schoolSlugs: null,
      entities: sidebarSchoolEntities(),
      canSeeAllSchools: true,
      showAdminActions: true,
      showApprovals: true,
      showArtworkLocker: true,
      showUsersNav: true,
      showCreateProgram: true,
      showOnboardingChecklist: false,
      preMigrationMode: false,
    };
  }

  const {slugs: programSlugs, preMigration} = await loadProgramSlugs(userId);
  const schoolSlugs = await loadSchoolSlugsForPrograms(programSlugs);
  const allowedEntities = sidebarSchoolEntities().filter((entity) =>
    schoolSlugs.includes(entity.slug),
  );

  const isDirectorOrManager = role === "director" || role === "manager";
  let showOnboardingChecklist = isDirectorOrManager && !onboardingDismissed;
  if (showOnboardingChecklist && !preMigration) {
    const assigned = (await sql().query(
      `select 1 from user_program_assignments where user_id = $1 limit 1`,
      [userId],
    )) as unknown[];
    const hasProgram = assigned.length > 0;
    let hasRoster = false;
    if (hasProgram) {
      const roster = (await sql().query(
        `select 1 from roster_rows r
         join user_program_assignments a on a.program_slug = r.program_slug
         where a.user_id = $1 limit 1`,
        [userId],
      )) as unknown[];
      hasRoster = roster.length > 0;
    }
    if (hasProgram && hasRoster) showOnboardingChecklist = false;
  }

  return {
    userId,
    role,
    email,
    name,
    programSlugs: preMigration ? null : programSlugs,
    schoolSlugs: preMigration ? null : schoolSlugs,
    entities: preMigration ? sidebarSchoolEntities() : allowedEntities,
    canSeeAllSchools: false,
    showAdminActions: false,
    showApprovals: false,
    showArtworkLocker: false,
    showUsersNav: false,
    showCreateProgram: isDirectorOrManager,
    showOnboardingChecklist,
    preMigrationMode: preMigration,
  };
}

export async function requireAccess(): Promise<AccessContext> {
  const access = await getAccessContext();
  if (!access) redirect("/login");
  return access;
}

export async function requireAdmin(): Promise<AccessContext> {
  const access = await requireAccess();
  if (access.role !== "admin") notFound();
  return access;
}

export function programFilterClause(paramIndex: number, access: AccessContext) {
  if (access.programSlugs === null) {
    return {clause: "", params: [] as string[]};
  }
  if (access.programSlugs.length === 0) {
    return {clause: " and false", params: [] as string[]};
  }
  return {
    clause: ` and p.slug = any($${paramIndex}::text[])`,
    params: [access.programSlugs],
  };
}

export async function assertProgramAccess(access: AccessContext, slug: string) {
  if (access.programSlugs === null) return;
  if (!access.programSlugs.includes(slug)) notFound();
}

/** Director/manager with zero program assignments (post-migration). */
export function isPendingAccess(access: AccessContext) {
  return (
    !access.canSeeAllSchools &&
    !access.preMigrationMode &&
    access.entities.length === 0
  );
}

export async function resolveCurrentEntity(access: AccessContext): Promise<CatalogEntity> {
  if (isPendingAccess(access)) return pendingSchool;

  const jar = await cookies();
  const slug = jar.get("volta_entity")?.value;

  if (slug === allSchools.slug) {
    if (access.canSeeAllSchools) return allSchools;
    if (access.entities[0]) return access.entities[0];
    return pendingSchool;
  }

  if (slug && access.entities.some((entity) => entity.slug === slug)) {
    return entityBySlug(slug);
  }

  if (access.canSeeAllSchools) return allSchools;
  if (access.entities[0]) return access.entities[0];
  return pendingSchool;
}

export function schoolFilterForStore(access: AccessContext, entitySlug: string) {
  if (entitySlug === pendingSchool.slug || isPendingAccess(access)) return null;
  if (access.role === "admin" && entitySlug === allSchools.slug) return null;
  if (access.schoolSlugs === null) return entitySlug === allSchools.slug ? null : entitySlug;
  if (access.schoolSlugs.length === 0) return null;
  if (!access.schoolSlugs.includes(entitySlug)) notFound();
  return entitySlug;
}
