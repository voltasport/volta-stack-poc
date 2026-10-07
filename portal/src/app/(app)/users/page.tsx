import {UsersAdmin} from "@/components/users-admin";
import {Shell} from "@/components/shell";
import {requireAdmin, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getShellMetrics} from "@/lib/shell-metrics";
import {
  getUserAssignments,
  listPortalUsers,
  listProgramsForAdmin,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const access = await requireAdmin();
  const entity = await resolveCurrentEntity(access);
  const metrics = await getShellMetrics(access, entity);
  const shellConfig = createShellConfig(access, entity, metrics);
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
