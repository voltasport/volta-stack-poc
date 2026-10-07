import {getAccessContext, requireAccess, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getProgramSlugs, getPrograms, getTasks} from "@/lib/queries";

export async function loadPortalPage() {
  const access = await requireAccess();
  const entity = await resolveCurrentEntity(access);
  const schoolFilter = entity.slug === "all" ? undefined : entity.slug;
  const programs = await getPrograms(access, schoolFilter);
  const tasks = await getTasks(access);
  const visibleTasks = access.showApprovals
    ? tasks
    : tasks.filter((task) => !task.href.startsWith("/approvals"));
  const rosterSlug = programs[0]?.slug ?? (await getProgramSlugs(access))[0];
  const shellConfig = createShellConfig(
    access,
    entity,
    programs.length,
    visibleTasks.length,
    rosterSlug,
  );
  return {access, entity, programs, tasks: visibleTasks, shellConfig};
}

export async function loadPortalPageOptional() {
  const access = await getAccessContext();
  if (!access) return null;
  const entity = await resolveCurrentEntity(access);
  const schoolFilter = entity.slug === "all" ? undefined : entity.slug;
  const programs = await getPrograms(access, schoolFilter);
  const tasks = await getTasks(access);
  const visibleTasks = access.showApprovals
    ? tasks
    : tasks.filter((task) => !task.href.startsWith("/approvals"));
  const rosterSlug = programs[0]?.slug ?? (await getProgramSlugs(access))[0];
  const shellConfig = createShellConfig(
    access,
    entity,
    programs.length,
    visibleTasks.length,
    rosterSlug,
  );
  return {access, entity, programs, tasks: visibleTasks, shellConfig};
}
