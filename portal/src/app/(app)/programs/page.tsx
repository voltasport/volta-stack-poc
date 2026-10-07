import Link from "next/link";
import {redirect} from "next/navigation";
import {Shell, StatusPill} from "@/components/shell";
import {loadPortalPage} from "@/lib/page-shell";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{tab?: string}>;
}) {
  const {tab} = await searchParams;
  const {entity, programs, shellConfig} = await loadPortalPage();

  if (tab === "roster" && programs[0]) {
    redirect(`/programs/${programs[0].slug}?tab=roster`);
  }

  return (
    <Shell config={shellConfig}>
      <p className="text-sm text-[#6d7b8a]">
        {entity.slug === "all" ? "All schools" : entity.name}
      </p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">PROGRAMS</h1>
      {programs.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#3c4a5c]">
          No programs are available for your account in this view.
        </p>
      ) : (
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
      )}
    </Shell>
  );
}
