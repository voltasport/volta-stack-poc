import {notFound} from "next/navigation";
import {ProgramDetail} from "@/components/program-detail";
import {Shell} from "@/components/shell";
import {getProgram} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{slug: string}>;
  searchParams: Promise<{tab?: string}>;
}) {
  const {slug} = await params;
  const {tab} = await searchParams;
  const program = await getProgram(slug);
  if (!program) notFound();

  return (
    <Shell>
      <ProgramDetail program={program} initialTab={tab} />
    </Shell>
  );
}
