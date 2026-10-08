import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {importRosterCsvRows, upsertRosterPlayer} from "@/lib/portal-programs";
import {previewRosterCsv} from "@/lib/roster-csv";

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
      const preview = previewRosterCsv(text);
      const result = await importRosterCsvRows(access, slug, preview.rows, mode);
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
      rowId?: number;
      paste?: string;
      mode?: "append" | "replace";
    };

    if (body.paste !== undefined) {
      const preview = previewRosterCsv(String(body.paste));
      const result = await importRosterCsvRows(access, slug, preview.rows, body.mode ?? "append");
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
      rowId: body.rowId,
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
