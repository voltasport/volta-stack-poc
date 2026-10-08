import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {loadSizedItems} from "@/lib/program-kit-items";
import {importRosterCsvRows, upsertRosterPlayer} from "@/lib/portal-programs";
import {previewRosterCsvForItems, rosterCsvSizeError} from "@/lib/roster-csv";

async function bulkImportError(slug: string, text: string) {
  const sizeError = rosterCsvSizeError(text);
  if (sizeError) return {error: sizeError, status: 413};
  const items = (await loadSizedItems(slug)).map((item) => ({
    id: item.id,
    name: item.name,
    sizeOptions: item.sizeOptions,
  }));
  const preview = previewRosterCsvForItems(text, items);
  if (!preview.canSave) {
    return {error: preview.error ?? "Add at least one valid player.", status: 400};
  }
  return null;
}

export async function POST(
  request: Request,
  {params}: {params: Promise<{slug: string}>},
) {
  try {
    const access = await getAccessContext();
    if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    const {slug} = await params;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const paste = String(form.get("paste") ?? "");
      const file = form.get("file");
      let text = paste;
      if (file instanceof File && file.size > 0) {
        text = await file.text();
      }
      const mode = String(form.get("mode") ?? "append") === "replace" ? "replace" : "append";
      const invalid = await bulkImportError(slug, text);
      if (invalid) return NextResponse.json({error: invalid.error}, {status: invalid.status});
      const items = (await loadSizedItems(slug)).map((item) => ({
        id: item.id,
        name: item.name,
        sizeOptions: item.sizeOptions,
      }));
      const preview = previewRosterCsvForItems(text, items);
      const result = await importRosterCsvRows(access, slug, preview.rows.filter((r) => r.ok), mode);
      if (!result.ok) {
        return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
      }
      return NextResponse.json({ok: true, count: result.count});
    }

    const body = (await request.json()) as {
      num?: string;
      name?: string;
      pos?: string;
      jersey?: string;
      short?: string;
      back?: string;
      sizes?: unknown;
      rowId?: number;
      paste?: string;
      mode?: "append" | "replace";
    };

    if (body.paste !== undefined) {
      const text = String(body.paste);
      const invalid = await bulkImportError(slug, text);
      if (invalid) return NextResponse.json({error: invalid.error}, {status: invalid.status});
      const items = (await loadSizedItems(slug)).map((item) => ({
        id: item.id,
        name: item.name,
        sizeOptions: item.sizeOptions,
      }));
      const preview = previewRosterCsvForItems(text, items);
      const mode = body.mode === "replace" ? "replace" : "append";
      const result = await importRosterCsvRows(access, slug, preview.rows.filter((row) => row.ok), mode);
      if (!result.ok) {
        return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
      }
      return NextResponse.json({ok: true, count: result.count});
    }

    const result = await upsertRosterPlayer(access, slug, {
      num: String(body.num ?? ""),
      name: String(body.name ?? ""),
      pos: body.pos !== undefined ? String(body.pos) : undefined,
      jersey: body.jersey !== undefined ? String(body.jersey) : undefined,
      short: body.short !== undefined ? String(body.short) : undefined,
      back: body.back !== undefined ? String(body.back) : undefined,
      sizes: body.sizes,
      rowId: typeof body.rowId === "number" && Number.isInteger(body.rowId) ? body.rowId : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
    }
    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not update roster"},
      {status: 500},
    );
  }
}
