import Link from "next/link";
import {getPrograms} from "@/lib/queries";
import {Shell, StatusPill} from "@/components/shell";
import {currentEntity} from "@/lib/current-entity";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const entity = await currentEntity();
  if (!entity.programs) {
    return (
      <Shell>
        <p className="text-sm text-[#6d7b8a]">{entity.name}</p>
        <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">PROGRAMS</h1>
        <p className="mt-4 text-sm leading-6 text-[#3c4a5c]">
          No programs are filed under {entity.name}. Switch to SLCC Athletics for the sample
          programs.
        </p>
      </Shell>
    );
  }
  const programs = await getPrograms();
  return (
    <Shell>
      <p className="text-sm text-[#6d7b8a]">
        {entity.slug === "all" ? "All schools · program records are SLCC Athletics" : entity.name}
      </p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">PROGRAMS</h1>
      <ul className="mt-6 overflow-hidden rounded-3xl bg-white">
        {programs.map((program) => (
          <li key={program.slug} className="border-t border-[#f0ece4] first:border-t-0">
            <Link href={`/programs/${program.slug}`} className="flex items-center justify-between px-5 py-4">
              <span>
                <span className="block font-semibold">{program.name}</span>
                <span className="text-sm text-[#6d7b8a]">{program.line}</span>
              </span>
              <StatusPill status={program.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
