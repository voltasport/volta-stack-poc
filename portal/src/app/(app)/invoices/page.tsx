import Link from "next/link";
import {Shell} from "@/components/shell";
import {EmptyPage} from "@/components/portal-empty-states";
import {isPendingAccess} from "@/lib/access";
import {allSchools, pendingSchool} from "@/lib/entities";
import {loadPortalPage} from "@/lib/page-shell";
import {getPrograms} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const {access, entity, shellConfig} = await loadPortalPage();

  if (isPendingAccess(access) || entity.slug === pendingSchool.slug) {
    return (
      <Shell config={shellConfig}>
        <EmptyPage title="Invoices">
          <p>Invoices will appear here once programs are assigned to your account.</p>
        </EmptyPage>
      </Shell>
    );
  }

  const schoolFilter =
    entity.slug === allSchools.slug || entity.slug === pendingSchool.slug
      ? undefined
      : entity.slug;
  const programs = await getPrograms(access, schoolFilter);
  const invoices = programs.flatMap((program) =>
    program.files
      .filter((file) => /invoice/i.test(file.name))
      .map((file) => ({program, file})),
  );

  return (
    <Shell config={shellConfig}>
      <h1 className="text-4xl font-black tracking-[-0.04em]">INVOICES</h1>
      <p className="mt-2 text-sm text-[#6d7b8a]">Program invoices for your assigned teams.</p>
      {invoices.length === 0 ? (
        <p className="mt-6 text-sm text-[#3c4a5c]">No invoices are available yet.</p>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-3xl bg-white">
          {invoices.map(({program, file}) => (
            <li key={`${program.slug}-${file.name}`} className="border-t border-[#f0ece4] first:border-t-0">
              <Link
                href={`/programs/${program.slug}?tab=files`}
                className="flex items-center justify-between px-5 py-4"
              >
                <span>
                  <span className="block font-semibold">{file.name}</span>
                  <span className="text-sm text-[#6d7b8a]">
                    {program.name} · {file.meta}
                  </span>
                </span>
                <span className="text-[#98a2b0]">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
