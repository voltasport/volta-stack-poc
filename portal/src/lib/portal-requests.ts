import {randomBytes} from "node:crypto";
import {sql} from "@/lib/db";
import {isMissingTable} from "@/lib/db-errors";

export type PortalRequestType = "school" | "program" | "roster" | "store";

export type PortalRequestRow = {
  id: string;
  user_id: string;
  type: PortalRequestType;
  payload: Record<string, unknown>;
  status: "pending" | "done";
  admin_notes: string | null;
  created_at: string;
  completed_at: string | null;
  user_name: string;
  user_email: string;
};

function id(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function slugifyOrgName(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "organization";
}

export async function portalRequestsTableReady() {
  try {
    await sql().query(`select 1 from portal_requests limit 1`);
    return true;
  } catch (error) {
    if (isMissingTable(error, "portal_requests")) return false;
    throw error;
  }
}

export async function createPortalRequest(input: {
  userId: string;
  type: PortalRequestType;
  payload: Record<string, unknown>;
}) {
  if (!(await portalRequestsTableReady())) {
    return {ok: false as const, error: "Requests are not available yet. Ask your admin to run db:migrate."};
  }
  const requestId = id("req");
  await sql().query(
    `insert into portal_requests (id, user_id, type, payload, status)
     values ($1, $2, $3, $4::jsonb, 'pending')`,
    [requestId, input.userId, input.type, JSON.stringify(input.payload)],
  );
  return {ok: true as const, id: requestId};
}

export async function listPortalRequestsForAdmin(): Promise<{
  ready: boolean;
  requests: PortalRequestRow[];
}> {
  if (!(await portalRequestsTableReady())) {
    return {ready: false, requests: []};
  }
  const rows = (await sql().query(
    `select r.id, r.user_id, r.type, r.payload, r.status, r.admin_notes, r.created_at, r.completed_at,
            u.name as user_name, u.email as user_email
     from portal_requests r
     join "user" u on u.id = r.user_id
     order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc`,
  )) as PortalRequestRow[];
  return {ready: true, requests: rows};
}

export async function listPortalRequestsForUser(userId: string): Promise<PortalRequestRow[]> {
  if (!(await portalRequestsTableReady())) return [];
  const rows = (await sql().query(
    `select r.id, r.user_id, r.type, r.payload, r.status, r.admin_notes, r.created_at, r.completed_at,
            u.name as user_name, u.email as user_email
     from portal_requests r
     join "user" u on u.id = r.user_id
     where r.user_id = $1
     order by r.created_at desc`,
    [userId],
  )) as PortalRequestRow[];
  return rows;
}

export async function completePortalRequest(input: {
  requestId: string;
  adminUserId: string;
  adminNotes?: string;
}) {
  if (!(await portalRequestsTableReady())) {
    return {ok: false as const, error: "Requests table is not migrated yet."};
  }
  const rows = (await sql().query(
    `select id, user_id, type, payload, status from portal_requests where id = $1`,
    [input.requestId],
  )) as {
    id: string;
    user_id: string;
    type: PortalRequestType;
    payload: Record<string, unknown>;
    status: string;
  }[];
  const row = rows[0];
  if (!row) return {ok: false as const, error: "Request not found"};
  if (row.status === "done") return {ok: true as const};

  if (row.type === "school") {
    const schoolName = String(row.payload.schoolName ?? row.payload.school_name ?? "").trim();
    if (schoolName) {
      let slug = slugifyOrgName(schoolName);
      const existing = (await sql().query(`select slug from organizations where slug = $1`, [slug])) as {
        slug: string;
      }[];
      if (existing[0]) {
        slug = `${slug}-${randomBytes(3).toString("hex")}`;
      }
      const logoPath = row.payload.logoPath ?? row.payload.logo_path ?? null;
      try {
        await sql().query(
          `insert into organizations (slug, name, logo_path)
           values ($1, $2, $3)
           on conflict (slug) do update set name = excluded.name, logo_path = coalesce(excluded.logo_path, organizations.logo_path)`,
          [slug, schoolName, logoPath],
        );
        await sql().query(
          `update "user" set organization_slug = $2, "updatedAt" = now() where id = $1`,
          [row.user_id, slug],
        );
      } catch (error) {
        if (!isMissingTable(error, "organizations")) throw error;
      }
    }
  }

  await sql().query(
    `update portal_requests
     set status = 'done',
         admin_notes = coalesce($2, admin_notes),
         completed_at = now(),
         completed_by = $3
     where id = $1`,
    [input.requestId, input.adminNotes ?? null, input.adminUserId],
  );
  return {ok: true as const};
}
