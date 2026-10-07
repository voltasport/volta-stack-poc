import {randomBytes} from "node:crypto";
import {sql} from "@/lib/db";
import {isMissingTable} from "@/lib/db-errors";
import type {CatalogEntity} from "@/lib/entities";

export function organizationNameFromEmail(email: string) {
  const domain = email.split("@")[1]?.split(".")[0] ?? "";
  if (!domain) return "My organization";
  const words = domain.replace(/[-_]+/g, " ").trim();
  return words.replace(/\b\w/g, (c) => c.toUpperCase()) || "My organization";
}

export function slugifyOrganizationName(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "organization";
}

export async function portalOrganizationsTableReady() {
  try {
    await sql().query(`select 1 from portal_organizations limit 1`);
    return true;
  } catch (error) {
    if (isMissingTable(error, "portal_organizations")) return false;
    throw error;
  }
}

export async function ensurePortalOrganization(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return {ok: false as const, error: "Organization name is required."};
  if (!(await portalOrganizationsTableReady())) {
    return {ok: false as const, error: "Organizations are not available until db:migrate (003)."};
  }
  let slug = slugifyOrganizationName(trimmed);
  const existing = (await sql().query(`select slug from portal_organizations where slug = $1`, [
    slug,
  ])) as {slug: string}[];
  if (existing[0]) {
    return {ok: true as const, slug, name: trimmed};
  }
  const taken = (await sql().query(`select slug from portal_organizations where slug = $1`, [
    slug,
  ])) as {slug: string}[];
  if (taken[0]) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  await sql().query(`insert into portal_organizations (slug, name) values ($1, $2)`, [
    slug,
    trimmed,
  ]);
  return {ok: true as const, slug, name: trimmed};
}

export async function linkUserToOrganization(userId: string, orgSlug: string) {
  try {
    await sql().query(
      `update "user" set organization_slug = $2, "updatedAt" = now() where id = $1`,
      [userId, orgSlug],
    );
  } catch (error) {
    if (isMissingTable(error, "portal_organizations")) return;
    throw error;
  }
}

export async function loadOrganizationEntities(slugs: string[]): Promise<CatalogEntity[]> {
  if (slugs.length === 0) return [];
  if (!(await portalOrganizationsTableReady())) return [];
  const rows = (await sql().query(
    `select slug, name from portal_organizations where slug = any($1::text[])`,
    [slugs],
  )) as {slug: string; name: string}[];
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    short: row.name.slice(0, 2).toUpperCase(),
    programs: true,
    match: null,
  }));
}

export function rosterBackName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? displayName;
  const back = last.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return back.slice(0, 12) || "—";
}
