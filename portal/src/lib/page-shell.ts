import {getAccessContext, requireAccess, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getShellMetrics} from "@/lib/shell-metrics";
import {getTasks} from "@/lib/queries";

export async function loadPortalPage() {
  const access = await requireAccess();
  const entity = await resolveCurrentEntity(access);
  const metrics = await getShellMetrics(access, entity);
  const tasks = await getTasks(access);
  const visibleTasks = access.showApprovals
    ? tasks
    : tasks.filter((task) => !task.href.startsWith("/approvals"));
  const shellConfig = createShellConfig(access, entity, metrics);
  return {
    access,
    entity,
    programs: metrics.programs,
    tasks: visibleTasks,
    shellConfig,
  };
}

export async function loadPortalPageOptional() {
  const access = await getAccessContext();
  if (!access) return null;
  const entity = await resolveCurrentEntity(access);
  const metrics = await getShellMetrics(access, entity);
  const tasks = await getTasks(access);
  const visibleTasks = access.showApprovals
    ? tasks
    : tasks.filter((task) => !task.href.startsWith("/approvals"));
  const shellConfig = createShellConfig(access, entity, metrics);
  return {
    access,
    entity,
    programs: metrics.programs,
    tasks: visibleTasks,
    shellConfig,
  };
}
