"use client";

import Link from "next/link";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Suspense, useEffect, useState} from "react";
import {signOut, useSession} from "@/lib/auth-client";
import {allSchools, entities, entityBySlug} from "@/lib/entities";

const nav = [
  {href: "/", label: "Overview", match: "exact" as const},
  {href: "/programs", label: "Programs", count: "4", match: "programs" as const},
  {href: "/approvals/away-kit", label: "Approvals", count: "1", alert: true, match: "prefix" as const},
  {href: "/programs/womens-soccer?tab=roster", label: "Rosters", count: "4", alert: true, match: "roster" as const},
  {href: "/store", label: "Team stores", match: "prefix" as const},
  {href: "/programs/cross-country?tab=files", label: "Invoices", match: "none" as const},
  {href: "/programs/cross-country?tab=files", label: "Artwork locker", match: "none" as const},
];

function EntitySwitcher({
  slug,
  includeAll,
  onChange,
}: {
  slug: string;
  includeAll: boolean;
  onChange: (slug: string) => void;
}) {
  const router = useRouter();
  const choices = includeAll ? [allSchools, ...entities] : entities;
  const entity = choices.find((item) => item.slug === slug) ?? choices[0];

  return (
    <label className="mx-3 mt-4 flex items-center gap-2 rounded-xl bg-[#163024] px-3 py-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#3dcb7a] text-[11px] font-bold text-[#0c1726]">
        {entity.short}
      </span>
      <select
        aria-label="School"
        value={entity.slug}
        onChange={(event) => {
          const next = event.target.value;
          document.cookie = `volta_entity=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
          onChange(next);
          router.refresh();
        }}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none"
      >
        {choices.map((item) => (
          <option key={item.slug} value={item.slug} className="text-[#0c1726]">
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab");
  const {data: session, isPending} = useSession();
  const isAdmin = (session?.user as {role?: string} | undefined)?.role === "admin";
  const [slug, setSlug] = useState(entities[0].slug);

  useEffect(() => {
    if (isPending) return;
    const row = document.cookie.split("; ").find((entry) => entry.startsWith("volta_entity="));
    const fromCookie = row ? decodeURIComponent(row.slice("volta_entity=".length)) : null;
    if (fromCookie === allSchools.slug && !isAdmin) {
      setSlug(entities[0].slug);
      return;
    }
    if (fromCookie) {
      setSlug(fromCookie);
      return;
    }
    if (isAdmin) {
      document.cookie = `volta_entity=${allSchools.slug}; path=/; max-age=31536000; samesite=lax`;
      setSlug(allSchools.slug);
    }
  }, [isAdmin, isPending]);

  const entity = entityBySlug(slug);

  return (
    <aside className="flex w-[240px] shrink-0 flex-col bg-[#0c1726] text-white">
      <div className="flex items-center gap-2 px-5 pt-5">
        <span className="text-[15px] font-extrabold tracking-[0.14em]">VOLTA</span>
        <span className="rounded-full bg-[#16304a] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#9eb6c9]">
          PORTAL
        </span>
      </div>

      <EntitySwitcher slug={slug} includeAll={isAdmin} onChange={setSlug} />

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {nav.map((item) => {
          const active =
            item.match === "exact"
              ? pathname === "/"
              : item.match === "programs"
                ? pathname.startsWith("/programs") && tab !== "roster"
                : item.match === "roster"
                  ? tab === "roster"
                  : item.match === "prefix"
                    ? pathname.startsWith(item.href)
                    : false;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                active ? "bg-[#1a3048] font-semibold text-white" : "text-[#c5d2df] hover:bg-white/5"
              }`}
            >
              <span>{item.label}</span>
              {item.count && entity.programs ? (
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${
                    item.alert ? "bg-[#3dcb7a] text-[#0c1726]" : "text-[#8aa0b5]"
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="mx-3 mb-1 text-left text-xs font-semibold text-[#9eb0c2]"
        onClick={async () => {
          await signOut();
          router.push("/login");
          router.refresh();
        }}
      >
        Sign out
      </button>
      <div className="m-3 flex items-center gap-3 rounded-2xl bg-[#13283a] p-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#24384c] text-[11px] font-bold">
          MO
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Melanie</p>
          <p className="text-[11px] text-[#9eb0c2]">your rep · replies in ~10 min</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3dcb7a] text-[#0c1726]">
          ›
        </span>
      </div>
    </aside>
  );
}

export function Shell({children}: {children: React.ReactNode}) {
  return (
    <div className="flex min-h-screen bg-[#f3f0e8] text-[#122033]">
      <Suspense fallback={<div className="w-[240px] bg-[#0c1726]" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[#e4dfd4] bg-[#f7f4ee] px-6 py-2 text-xs text-[#5d6b7a]">
          <p>
            <span className="font-semibold text-[#122033]">Next.js + Vercel.</span> Program, proof,
            and roster data live in this app.
          </p>
          <a
            href="https://volta-storefront.vercel.app/portal"
            className="shrink-0 font-semibold text-[#147a45] underline-offset-2 hover:underline"
          >
            Open the Hydrogen proof
          </a>
        </div>
        <div className="flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({status}: {status: string}) {
  const styles: Record<string, string> = {
    "On track": "bg-[#e5f6ea] text-[#187243]",
    "Needs you": "bg-[#f8efd0] text-[#8a6914]",
    Complete: "bg-[#eef1f4] text-[#3c4a5c]",
    Starting: "bg-[#e8eef6] text-[#3d5678]",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? styles.Complete}`}>
      {status}
    </span>
  );
}

export function Segments({filled, total}: {filled: number; total: number}) {
  return (
    <div className="flex gap-1">
      {Array.from({length: total}).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 w-7 rounded-full ${index < filled ? "bg-[#3cba6f]" : "bg-[#e6e1d8]"}`}
        />
      ))}
    </div>
  );
}
