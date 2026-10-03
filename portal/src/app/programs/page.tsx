import Link from "next/link";
import {programs} from "@/lib/data";
import {Shell, StatusPill} from "@/components/shell";

export default function ProgramsPage() {
  return (
    <Shell>
      <p className="text-sm text-[#6d7b8a]">SLCC Athletics</p>
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
