import type {AccessContext} from "@/lib/access";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  count?: string;
  alert?: boolean;
  match: "exact" | "programs" | "roster" | "prefix" | "invoices" | "artwork" | "users" | "none";
};

export function buildNav(access: AccessContext, programCount: number, needsYouCount: number): NavItem[] {
  const programCountLabel = programCount > 0 ? String(programCount) : undefined;
  const items: NavItem[] = [
    {href: "/", label: "Overview", icon: "◉", match: "exact"},
    {
      href: "/programs",
      label: "Programs",
      icon: "▦",
      count: programCountLabel,
      match: "programs",
    },
  ];

  if (access.showApprovals) {
    items.push({
      href: "/approvals/away-kit",
      label: "Approvals",
      icon: "✓",
      count: needsYouCount > 0 ? String(needsYouCount) : "1",
      alert: true,
      match: "prefix",
    });
  }

  items.push({
    href: "/programs?tab=roster",
    label: "Rosters",
    icon: "☰",
    count: programCountLabel,
    match: "roster",
  });

  items.push({href: "/store", label: "Team stores", icon: "▣", match: "prefix"});
  items.push({href: "/invoices", label: "Invoices", icon: "⎘", match: "invoices"});

  if (access.showArtworkLocker) {
    items.push({
      href: "/artwork-locker",
      label: "Artwork locker",
      icon: "▤",
      match: "artwork",
    });
  }

  if (access.showUsersNav) {
    items.push({href: "/users", label: "Users", icon: "👤", match: "users"});
  }

  return items;
}

export function navItemActive(item: NavItem, pathname: string, tab: string | null) {
  if (item.match === "exact") return pathname === "/";
  if (item.match === "programs") {
    return pathname.startsWith("/programs") && tab !== "roster";
  }
  if (item.match === "roster") {
    return tab === "roster" && pathname.startsWith("/programs");
  }
  if (item.match === "invoices") return pathname === "/invoices";
  if (item.match === "artwork") return pathname === "/artwork-locker";
  if (item.match === "users") return pathname.startsWith("/users");
  if (item.match === "prefix") return pathname.startsWith(item.href);
  return false;
}
