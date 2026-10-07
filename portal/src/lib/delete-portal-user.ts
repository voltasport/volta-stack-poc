import {sql} from "@/lib/db";

export async function countAdmins() {
  const rows = (await sql().query(
    `select count(*)::int as n from "user" where role = 'admin'`,
  )) as {n: number}[];
  return rows[0]?.n ?? 0;
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

  const orphanSlugs = (await sql().query(
    `select a.program_slug
     from user_program_assignments a
     where a.user_id = $1
       and not exists (
         select 1 from user_program_assignments b
         where b.program_slug = a.program_slug and b.user_id <> $1
       )`,
    [input.targetUserId],
  )) as {program_slug: string}[];

  for (const row of orphanSlugs) {
    await sql().query(`delete from programs where slug = $1`, [row.program_slug]);
  }

  await sql().query(`delete from user_program_assignments where user_id = $1`, [
    input.targetUserId,
  ]);
  await sql().query(`delete from session where "userId" = $1`, [input.targetUserId]);
  await sql().query(`delete from account where "userId" = $1`, [input.targetUserId]);
  await sql().query(`delete from "user" where id = $1`, [input.targetUserId]);

  return {ok: true as const, email: target.email};
}
