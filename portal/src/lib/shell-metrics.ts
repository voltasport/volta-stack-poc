import type {AccessContext} from "@/lib/access";
import {pendingSchool, type CatalogEntity} from "@/lib/entities";
import {getPrograms, getTasks} from "@/lib/queries";

export type ShellMetrics = {
  programs: Awaited<ReturnType<typeof getPrograms>>;
  programCount: number;
  approvalCount: number;
};

export async function getShellMetrics(
  access: AccessContext,
  entity: CatalogEntity,
): Promise<ShellMetrics> {
  const schoolFilter =
    entity.slug === "all" || entity.slug === pendingSchool.slug ? undefined : entity.slug;
  const programs = await getPrograms(access, schoolFilter);
  const tasks = await getTasks(access);
  const scopedSlugs = new Set(programs.map((program) => program.slug));
  const entityTasks =
    entity.slug === "all"
      ? tasks
      : tasks.filter(
          (task) => task.program_slug === null || scopedSlugs.has(task.program_slug),
        );
  const approvalCount = access.showApprovals
    ? entityTasks.filter((task) => task.href.startsWith("/approvals")).length
    : 0;
  return {
    programs,
    programCount: programs.length,
    approvalCount,
  };
}
