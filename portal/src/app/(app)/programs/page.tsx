import Link from "next/link";
import {redirect} from "next/navigation";
import {AdminActions, Shell, StatusPill} from "@/components/shell";
import {EmptyPage} from "@/components/portal-empty-states";
import {isPendingAccess} from "@/lib/access";
import {allSchools, pendingSchool} from "@/lib/entities";
import {loadPortalPage} from "@/lib/page-shell";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{tab?: string}>;
}) {
  const {tab} = await searchParams;
  const {access, entity, programs, shellConfig} = await loadPortalPage();

  if (tab === "roster" && programs[0]) {
    redirect(`/programs/${programs[0].slug}?tab=roster`);
  }

  const isRoster = tab === "roster";
  const eyebrow =
    entity.slug === pendingSchool.slug
      ? undefined
      : entity.slug === allSchools.slug
        ? "All schools"
        : entity.name;

  if (isPendingAccess(access) || entity.slug === pendingSchool.slug) {
    return (
      <Shell config={shellConfig}>
        <EmptyPage title={isRoster ? "Rosters" : "Programs"}>
          <p>
            {shellConfig.showCreateProgram
              ? "Create your first program to get started — it will show up here and under Rosters."
              : isRoster
                ? "Rosters will show up here once programs are assigned to your account."
                : "Programs will show up here once they are connected to your account."}
          </p>
          {shellConfig.showCreateProgram ? (
            <div className="mt-4">
              <AdminActions
                show={false}
                showCreateProgram
                defaultOrganizationName={shellConfig.defaultOrganizationName}
              />
            </div>
          ) : null}
        </EmptyPage>
      </Shell>
    );
  }

  return (
    <Shell config={shellConfig}>
      {eyebrow ? <p className="text-sm text-[#6d7b8a]">{eyebrow}</p> : null}
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-4xl font-black tracking-[-0.04em]">
          {isRoster ? "ROSTERS" : "PROGRAMS"}
        </h1>
        <AdminActions
          show={shellConfig.showAdminActions}
          showCreateProgram={shellConfig.showCreateProgram}
          defaultOrganizationName={shellConfig.defaultOrganizationName}
        />
      </div>
      {programs.length === 0 ? (
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#3c4a5c]">
          {isRoster
            ? `No rosters yet for ${entity.slug === allSchools.slug ? "your schools" : entity.name}. Rosters appear when programs are assigned.`
            : `No programs are linked to your account${entity.slug === allSchools.slug ? "" : ` for ${entity.name}`} yet.`}
        </p>
      ) : isRoster ? (
        <ul className="mt-6 overflow-hidden rounded-3xl bg-white">
          {programs.map((program) => (
            <li key={program.slug} className="border-t border-[#f0ece4] first:border-t-0">
              <Link
                href={`/programs/${program.slug}?tab=roster`}
                className="flex items-center justify-between px-5 py-4"
              >
                <span>
                  <span className="block font-semibold">{program.name}</span>
                  <span className="text-sm text-[#6d7b8a]">{program.line}</span>
                </span>
                <span className="text-[#98a2b0]">→</span>
              </Link>
            </li>
          ))}
        </ul>
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
