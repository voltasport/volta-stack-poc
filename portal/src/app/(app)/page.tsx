import Link from "next/link";
import {getUpdates} from "@/lib/queries";
import {AdminActions, Segments, Shell, StatusPill} from "@/components/shell";
import {EmptyPage} from "@/components/portal-empty-states";
import {isPendingAccess} from "@/lib/access";
import {allSchools, entities, pendingSchool, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";
import {firstNameFromUser, overviewDateLine} from "@/lib/display-name";
import {loadPortalPage} from "@/lib/page-shell";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const {access, entity, programs, tasks, shellConfig} = await loadPortalPage();
  const updates = await getUpdates();
  const firstName = firstNameFromUser(access.name, access.email);

  if (isPendingAccess(access) || entity.slug === pendingSchool.slug) {
    return (
      <Shell config={shellConfig}>
        <EmptyPage title={`Welcome, ${firstName}`}>
          <p>
            Welcome to Volta — your portal is being set up. Your Volta rep will connect your
            programs shortly.
          </p>
          <p className="mt-3">
            When programs are assigned, you&apos;ll see rosters, proofs, and team stores here.
          </p>
        </EmptyPage>
      </Shell>
    );
  }

  if (programs.length === 0 && entity.slug !== allSchools.slug) {
    return (
      <Shell config={shellConfig}>
        <EmptyPage eyebrow={entity.name} title="No programs yet">
          <p>
            No programs are linked to your account for {entity.name} yet. Your Volta rep can add
            them, or switch schools in the sidebar if you work with multiple teams.
          </p>
        </EmptyPage>
      </Shell>
    );
  }

  const catalog =
    access.role === "admin" && entity.slug === allSchools.slug
      ? await fetchShopifyProducts()
      : null;
  const visibleSchools = access.canSeeAllSchools ? entities : access.entities;
  const schools = catalog
    ? visibleSchools.map((school) => ({
        ...school,
        count: productsForEntity(catalog.products, school.slug).length,
        programCount: programs.filter((program) => program.schoolSlug === school.slug).length,
      }))
    : [];

  const inProduction = programs.filter(
    (program) => program.status === "On track" || program.phase.includes("PRODUCTION"),
  ).length;
  const nextDelivery =
    programs.find((program) => program.deliveryDate !== "TBD")?.deliveryDate ?? "—";

  return (
    <Shell config={shellConfig}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-sm text-[#6d7b8a]">{overviewDateLine()}</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-[#101828] sm:text-5xl">
            Hello, {firstName}
          </h1>
        </div>
        <AdminActions show={shellConfig.showAdminActions} />
      </div>

      {schools.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {schools
            .filter((school) => school.slug !== "other" || school.count > 0)
            .map((school) => (
              <li key={school.slug} className="rounded-3xl bg-white px-5 py-4">
                <p className="text-xs font-semibold tracking-wide text-[#6d7b8a]">{school.short}</p>
                <p className="mt-1 text-lg font-black">{school.name}</p>
                <p className="mt-2 text-sm text-[#3c4a5c]">
                  {school.programCount
                    ? `${school.programCount} programs${school.count ? ` · ${school.count} products` : ""}`
                    : school.count === 0
                      ? "No team store products yet"
                      : `${school.count} products`}
                </p>
              </li>
            ))}
        </ul>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active programs" value={String(programs.length)} />
        <Stat label="In production" value={String(inProduction)} />
        <Stat label="Next delivery" value={nextDelivery} />
        <div className="rounded-3xl bg-[#0e1c30] px-5 py-4 text-white">
          <p className="text-xs text-[#b7c6d4]">Saved vs. dealer this year</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-[#3ee58a]">—</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <section className="rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(16,24,40,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-[0.08em]">PROGRAMS</h2>
            <Link href="/programs" className="text-sm font-semibold text-[#5f6e7d]">
              View all
            </Link>
          </div>
          {programs.length === 0 ? (
            <p className="text-sm text-[#3c4a5c]">No programs in this view yet.</p>
          ) : (
            <ul>
              {programs.map((program) => (
                <li key={program.slug} className="border-t border-[#f0ece4] first:border-t-0">
                  <Link
                    href={`/programs/${program.slug}`}
                    className="grid grid-cols-1 items-start gap-2 py-3 sm:grid-cols-[1.2fr_1.1fr_auto_auto] sm:items-center sm:gap-3"
                  >
                    <span>
                      <span className="block text-sm font-semibold">{program.name}</span>
                      <span className="block text-xs text-[#7b8794]">{program.line}</span>
                    </span>
                    <span>
                      <Segments filled={program.filled} total={program.total} />
                      <span className="mt-1 block text-xs text-[#7b8794]">{program.stage}</span>
                    </span>
                    <StatusPill status={program.status} />
                    <span className="text-[#98a2b0]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-3xl bg-[#0e1c30] p-5 text-white">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold tracking-[0.08em]">NEEDS YOU</h2>
              <span className="h-2 w-2 rounded-full bg-[#3dcb7a]" />
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-[#9eb0c2]">Nothing needs your attention right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {tasks.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-2xl bg-[#173049] px-3 py-3"
                    >
                      <Badge kind={item.badge} />
                      <span>
                        <span className="block text-sm font-semibold">{item.title}</span>
                        <span className="block text-xs text-[#9eb0c2]">{item.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5">
            <h2 className="text-sm font-extrabold tracking-[0.08em]">LATEST FROM VOLTA</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {updates.map((update) => (
                <li key={update.text} className="flex gap-2 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      update.tone === "live" ? "bg-[#3dcb7a]" : "bg-[#d5dbe3]"
                    }`}
                  />
                  <span>
                    <span className="block leading-snug">{update.text}</span>
                    <span className="text-xs text-[#7b8794]">{update.when}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-3xl bg-white px-5 py-4">
      <p className="text-xs text-[#6d7b8a]">{label}</p>
      <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function Badge({kind}: {kind: "check" | "4" | "doc"}) {
  if (kind === "4") {
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3d6f9a] text-sm font-bold">
        4
      </span>
    );
  }
  if (kind === "doc") {
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#173049] text-xs">DOC</span>
    );
  }
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3dcb7a] text-sm font-bold text-[#0c1726]">
      ✓
    </span>
  );
}
