import {UsersAdmin} from "@/components/users-admin";
import {Shell} from "@/components/shell";
import {requireAdmin, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {
  getProgramSlugs,
  getPrograms,
  getTasks,
  getUserAssignments,
  listPortalUsers,
  listProgramsForAdmin,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const access = await requireAdmin();
  const entity = await resolveCurrentEntity(access);
  const programs = await getPrograms(access);
  const tasks = await getTasks(access);
  const rosterSlug = programs[0]?.slug ?? (await getProgramSlugs(access))[0];
  const shellConfig = createShellConfig(access, entity, programs.length, tasks.length, rosterSlug);
  const [users, allPrograms] = await Promise.all([listPortalUsers(), listProgramsForAdmin()]);
  const assignments = Object.fromEntries(
    await Promise.all(
      users.map(async (user) => [user.id, await getUserAssignments(user.id)] as const),
    ),
  );

  return (
    <Shell config={shellConfig}>
      <UsersAdmin users={users} programs={allPrograms} assignments={assignments} />
    </Shell>
  );
}
