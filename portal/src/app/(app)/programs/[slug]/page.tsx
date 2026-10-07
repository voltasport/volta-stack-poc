import {notFound} from "next/navigation";
import {ProgramDetail} from "@/components/program-detail";
import {Shell} from "@/components/shell";
import {assertProgramAccess, requireAccess, resolveCurrentEntity} from "@/lib/access";
import {createShellConfig} from "@/lib/shell-config";
import {getProgram, getProgramSlugs, getPrograms, getTasks} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{slug: string}>;
  searchParams: Promise<{tab?: string}>;
}) {
  const access = await requireAccess();
  const {slug} = await params;
  await assertProgramAccess(access, slug);
  const {tab} = await searchParams;
  const program = await getProgram(access, slug);
  if (!program) notFound();

  const entity = await resolveCurrentEntity(access);
  const programs = await getPrograms(access, entity.slug === "all" ? undefined : entity.slug);
  const tasks = await getTasks(access);
  const rosterSlug = programs[0]?.slug ?? slug;
  const shellConfig = createShellConfig(access, entity, programs.length, tasks.length, rosterSlug);

  return (
    <Shell config={shellConfig}>
      <ProgramDetail
        program={program}
        initialTab={tab}
        showAdminActions={access.showAdminActions}
      />
    </Shell>
  );
}
