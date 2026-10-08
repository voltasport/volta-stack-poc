import {sql, sqlTransaction, type SqlStatement} from "@/lib/db";
import {allSchools, entities, pendingSchool} from "@/lib/entities";
import {isMissingTable} from "@/lib/db-errors";

export async function countAdmins() {
  const rows = (await sql().query(
    `select count(*)::int as n from "user" where role = 'admin'`,
  )) as {n: number}[];
  return rows[0]?.n ?? 0;
}

/**
 * Seeded schools (SLCC, Davis, ...) are never cascaded, even if only one user is assigned.
 * Only programs under a portal-created organization (portal_organizations) qualify.
 */
function protectedSchoolSlugs() {
  return [...entities.map((entity) => entity.slug), allSchools.slug, pendingSchool.slug];
}

async function solelyOwnedProgramSlugs(userId: string) {
  try {
    const rows = (await sql().query(
      `select a.program_slug
       from user_program_assignments a
       join programs p on p.slug = a.program_slug
       join portal_organizations o on o.slug = p.school_slug
       where a.user_id = $1
         and not (p.school_slug = any($2::text[]))
         and not exists (
           select 1 from user_program_assignments b
           where b.program_slug = a.program_slug and b.user_id <> $1
         )`,
      [userId, protectedSchoolSlugs()],
    )) as {program_slug: string}[];
    return rows.map((row) => row.program_slug);
  } catch (error) {
    if (isMissingTable(error, "portal_organizations")) return [] as string[];
    throw error;
  }
}

async function rosterCountForPrograms(slugs: string[]) {
  if (slugs.length === 0) return 0;
  const rows = (await sql().query(
    `select count(*)::int as n from roster_rows where program_slug = any($1::text[])`,
    [slugs],
  )) as {n: number}[];
  return rows[0]?.n ?? 0;
}

async function solelyOwnedOrganizationSlugs(userId: string, programSlugsToRemove: string[]) {
  try {
    const userRows = (await sql().query(`select organization_slug from "user" where id = $1`, [
      userId,
    ])) as {organization_slug: string | null}[];
    const orgSlug = userRows[0]?.organization_slug;
    if (!orgSlug) return [] as string[];
    if (protectedSchoolSlugs().includes(orgSlug)) return [] as string[];

    const otherUsers = (await sql().query(
      `select 1 from "user" where organization_slug = $1 and id <> $2 limit 1`,
      [orgSlug, userId],
    )) as unknown[];
    if (otherUsers.length > 0) return [];

    const remainingPrograms = (await sql().query(
      `select 1 from programs
       where school_slug = $1
         and not (slug = any($2::text[]))
       limit 1`,
      [orgSlug, programSlugsToRemove.length > 0 ? programSlugsToRemove : ["__none__"]],
    )) as unknown[];
    if (remainingPrograms.length > 0) return [];

    return [orgSlug];
  } catch (error) {
    if (isMissingTable(error, "portal_organizations")) return [];
    throw error;
  }
}

export async function previewDeletePortalUser(targetUserId: string) {
  const users = (await sql().query(`select id, email, role from "user" where id = $1`, [
    targetUserId,
  ])) as {id: string; email: string; role: string}[];
  const target = users[0];
  if (!target) {
    return {ok: false as const, error: "User not found."};
  }

  const programSlugs = await solelyOwnedProgramSlugs(targetUserId);
  const rosterPlayers = await rosterCountForPrograms(programSlugs);
  const organizations = (await solelyOwnedOrganizationSlugs(targetUserId, programSlugs)).length;

  return {
    ok: true as const,
    email: target.email,
    programs: programSlugs.length,
    rosterPlayers,
    organizations,
  };
}

export async function deletePortalUserById(input: {
  targetUserId: string;
  actingAdminUserId: string;
}) {
  if (input.targetUserId === input.actingAdminUserId) {
    return {ok: false as const, error: "You cannot delete your own account."};
  }

  const users = (await sql().query(`select id, email, role from "user" where id = $1`, [
    input.targetUserId,
  ])) as {id: string; email: string; role: string}[];
  const target = users[0];
  if (!target) {
    return {ok: false as const, error: "User not found."};
  }

  if (target.role === "admin") {
    const admins = await countAdmins();
    if (admins <= 1) {
      return {ok: false as const, error: "Cannot delete the last admin account."};
    }
  }

  const preview = await previewDeletePortalUser(input.targetUserId);
  if (!preview.ok) return preview;

  const programSlugs = await solelyOwnedProgramSlugs(input.targetUserId);
  const orgSlugs = await solelyOwnedOrganizationSlugs(input.targetUserId, programSlugs);

  const statements: SqlStatement[] = [];
  if (programSlugs.length > 0) {
    // Re-check sole ownership inside the transaction so a concurrent assignment is never lost.
    statements.push({
      text: `delete from programs p
             where p.slug = any($1::text[])
               and not (p.school_slug = any($3::text[]))
               and not exists (
                 select 1 from user_program_assignments b
                 where b.program_slug = p.slug and b.user_id <> $2
               )`,
      params: [programSlugs, input.targetUserId, protectedSchoolSlugs()],
    });
  }
  statements.push(
    {text: `delete from user_program_assignments where user_id = $1`, params: [input.targetUserId]},
    {text: `delete from session where "userId" = $1`, params: [input.targetUserId]},
    {text: `delete from account where "userId" = $1`, params: [input.targetUserId]},
    {text: `delete from "user" where id = $1`, params: [input.targetUserId]},
  );
  if (orgSlugs.length > 0) {
    statements.push({
      text: `delete from portal_organizations o
             where o.slug = any($1::text[])
               and not (o.slug = any($2::text[]))
               and not exists (select 1 from "user" u where u.organization_slug = o.slug)
               and not exists (select 1 from programs p where p.school_slug = o.slug)`,
      params: [orgSlugs, protectedSchoolSlugs()],
    });
  }
  await sqlTransaction(statements);

  return {
    ok: true as const,
    email: target.email,
    deletedPrograms: preview.programs,
    deletedRosterPlayers: preview.rosterPlayers,
    deletedOrganizations: preview.organizations,
  };
}
