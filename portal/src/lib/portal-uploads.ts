import {randomBytes} from "node:crypto";
import {sql} from "@/lib/db";
import {isMissingTable} from "@/lib/db-errors";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function uploadId() {
  return `upl_${randomBytes(12).toString("hex")}`;
}

export async function portalUploadsTableReady() {
  try {
    await sql().query(`select 1 from portal_uploads limit 1`);
    return true;
  } catch (error) {
    if (isMissingTable(error, "portal_uploads")) return false;
    throw error;
  }
}

export function assertAllowedImageUpload(bytes: Buffer, contentType: string) {
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error("Logo must be 2 MB or smaller.");
  }
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new Error("Logo must be PNG, JPEG, or WebP.");
  }
  return mime;
}

export async function savePortalUpload(input: {
  userId: string;
  bytes: Buffer;
  contentType: string;
}) {
  if (!(await portalUploadsTableReady())) {
    throw new Error("Uploads are not available until db:migrate (003) is applied.");
  }
  const contentType = assertAllowedImageUpload(input.bytes, input.contentType);
  const id = uploadId();
  await sql().query(
    `insert into portal_uploads (id, user_id, content_type, data, byte_size)
     values ($1, $2, $3, $4, $5)`,
    [id, input.userId, contentType, input.bytes, input.bytes.length],
  );
  return id;
}

export async function getPortalUpload(id: string) {
  if (!(await portalUploadsTableReady())) return null;
  const rows = (await sql().query(
    `select id, user_id, content_type, data, byte_size from portal_uploads where id = $1`,
    [id],
  )) as {
    id: string;
    user_id: string;
    content_type: string;
    data: Buffer;
    byte_size: number;
  }[];
  return rows[0] ?? null;
}

export async function canReadPortalUpload(
  upload: {user_id: string},
  access: {userId: string; role: string},
) {
  if (access.role === "admin") return true;
  return upload.user_id === access.userId;
}
