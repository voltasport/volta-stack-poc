"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {signOut} from "@/lib/auth-client";
import {allSchools, entityBySlug} from "@/lib/entities";
import {navItemActive, type NavItem} from "@/lib/shell-nav";
import type {ShellConfig, ShellEntity} from "@/lib/shell-config";

const SIDEBAR_STORAGE_KEY = "volta-sidebar-collapsed";
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;

function EntitySwitcher({
  slug,
  choices,
  collapsed,
  onChange,
}: {
  slug: string;
  choices: ShellEntity[];
  collapsed: boolean;
  onChange: (slug: string) => void;
}) {
  const router = useRouter();
  const entity = choices.find((item) => item.slug === slug) ?? choices[0];

  return (
    <label
      className={`relative mx-3 mt-4 flex items-center gap-2 rounded-xl bg-[#163024] px-3 py-2 ${
        collapsed ? "justify-center px-2" : ""
      }`}
      title={entity.name}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#3dcb7a] text-[11px] font-bold text-[#0c1726]">
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
        className={`min-w-0 bg-transparent text-sm font-semibold text-white outline-none ${
          collapsed ? "absolute inset-0 cursor-pointer opacity-0" : "flex-1"
        }`}
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

function SidebarPanel({
  config,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  config: ShellConfig;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<string | null>(null);
  const [slug, setSlug] = useState(config.defaultEntitySlug);

  useEffect(() => {
    const readTab = () => new URLSearchParams(window.location.search).get("tab");
    setTab(readTab());
    const onUrlChange = () => setTab(readTab());
    window.addEventListener("popstate", onUrlChange);
    window.addEventListener("volta-url-updated", onUrlChange);
    return () => {
      window.removeEventListener("popstate", onUrlChange);
      window.removeEventListener("volta-url-updated", onUrlChange);
    };
  }, [pathname]);

  useEffect(() => {
    const row = document.cookie.split("; ").find((entry) => entry.startsWith("volta_entity="));
    const fromCookie = row ? decodeURIComponent(row.slice("volta_entity=".length)) : null;
    const allowed = config.entityChoices.some((item) => item.slug === fromCookie);
    if (fromCookie && allowed) {
      setSlug(fromCookie);
      return;
    }
    setSlug(config.defaultEntitySlug);
    document.cookie = `volta_entity=${encodeURIComponent(config.defaultEntitySlug)}; path=/; max-age=31536000; samesite=lax`;
  }, [config.defaultEntitySlug, config.entityChoices]);

  const entity = entityBySlug(slug);
  const showCounts = entity.slug !== allSchools.slug || config.entityChoices.includes(allSchools);

  return (
    <>
      <div
        className={`flex shrink-0 items-center border-b border-white/5 py-4 ${
          collapsed ? "flex-col gap-2 px-2" : "justify-between gap-2 px-5"
        }`}
      >
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[15px] font-extrabold tracking-[0.14em]">VOLTA</span>
            <span className="rounded-full bg-[#16304a] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#9eb6c9]">
              PORTAL
            </span>
          </div>
        ) : (
          <span className="text-[13px] font-extrabold tracking-[0.12em]">V</span>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-base font-semibold leading-none text-[#9eb0c2] hover:bg-white/5 hover:text-white lg:grid"
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      <EntitySwitcher
        slug={slug}
        choices={config.entityChoices}
        collapsed={collapsed}
        onChange={setSlug}
      />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {config.nav.map((item: NavItem) => {
          const active = navItemActive(item, pathname, tab);
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              onClick={onNavigate}
              className={`flex items-center rounded-xl py-2 text-sm ${
                collapsed ? "justify-center px-2" : "justify-between px-3"
              } ${
                active ? "bg-[#1a3048] font-semibold text-white" : "text-[#c5d2df] hover:bg-white/5"
              }`}
            >
              <span className={`flex items-center gap-2 ${collapsed ? "" : "min-w-0"}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 font-[system-ui,sans-serif] text-base leading-none">
                  {item.icon}
                </span>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </span>
              {!collapsed && item.count && showCounts ? (
                <span
                  className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[11px] font-bold ${
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

      <div className="shrink-0 border-t border-white/5 px-3 py-3">
        <button
          type="button"
          aria-label="Sign out"
          className={`w-full rounded-lg text-xs font-semibold text-[#9eb0c2] hover:bg-white/5 hover:text-white ${
            collapsed ? "px-1 py-2 text-center leading-tight" : "px-1 py-1.5 text-left"
          }`}
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}

function Sidebar({
  config,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: {
  config: ShellConfig;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        className={`fixed inset-0 z-40 bg-[#0c1726]/60 backdrop-blur-[1px] transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />
      <aside
        style={{width}}
        className={`fixed inset-y-0 left-0 z-50 flex h-svh flex-col overflow-hidden bg-[#0c1726] text-white transition-[width,transform] duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <SidebarPanel
          config={config}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
          onNavigate={onCloseMobile}
        />
      </aside>
    </>
  );
}

export function Shell({
  children,
  config,
  flush = false,
}: {
  children: React.ReactNode;
  config: ShellConfig;
  flush?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="min-h-svh bg-[#f3f0e8] text-[#122033]">
      <Sidebar
        config={config}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className="flex min-h-svh min-w-0 flex-col transition-[padding] duration-200 ease-out lg:pl-[var(--sidebar-offset)]"
        style={
          {
            "--sidebar-offset": hydrated ? `${sidebarWidth}px` : `${SIDEBAR_WIDTH}px`,
          } as React.CSSProperties
        }
      >
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#e4dfd4] bg-[#f7f4ee] px-4 py-2 text-xs text-[#5d6b7a] lg:hidden sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e4dfd4] bg-white text-[#122033]"
            onClick={() => setMobileOpen(true)}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
            </span>
          </button>
          <a
            href="https://voltasport.co"
            className="shrink-0 font-semibold text-[#147a45] underline-offset-2 hover:underline"
          >
            Home
          </a>
        </div>
        <div className={`min-w-0 flex-1 ${flush ? "" : "px-4 py-5 sm:px-6"}`}>{children}</div>
      </div>
    </div>
  );
}

export function AdminActions({show}: {show: boolean}) {
  if (!show) return null;
  return (
    <div className="flex flex-wrap gap-2 sm:pt-3">
      <button
        type="button"
        className="rounded-full border border-[#e4dfd6] bg-white px-4 py-2 text-sm font-semibold"
      >
        Share status link
      </button>
      <button
        type="button"
        className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white"
      >
        + New program
      </button>
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
    <div className="flex flex-wrap gap-1">
      {Array.from({length: total}).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 w-7 shrink-0 rounded-full ${index < filled ? "bg-[#3cba6f]" : "bg-[#e6e1d8]"}`}
        />
      ))}
    </div>
  );
}
