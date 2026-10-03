import {notFound} from "next/navigation";
import {ProgramDetail} from "@/components/program-detail";
import {Shell} from "@/components/shell";
import {getProgram} from "@/lib/data";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{slug: string}>;
  searchParams: Promise<{tab?: string}>;
}) {
  const {slug} = await params;
  const {tab} = await searchParams;
  const program = getProgram(slug);
  if (!program) notFound();

  return (
    <Shell>
      <ProgramDetail program={program} initialTab={tab} />
    </Shell>
  );
}
