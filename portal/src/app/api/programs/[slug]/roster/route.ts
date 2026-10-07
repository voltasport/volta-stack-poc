import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {
  importRosterLines,
  parseRosterImport,
  upsertRosterPlayer,
} from "@/lib/portal-programs";

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
      const lines = parseRosterImport(text);
      const result = await importRosterLines(access, slug, lines, mode);
      if (!result.ok) {
        return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
      }
      return NextResponse.json({ok: true, count: result.count});
    }

    const body = (await request.json()) as {
      num?: string;
      name?: string;
      pos?: string;
      rowId?: number;
      paste?: string;
      mode?: "append" | "replace";
    };

    if (body.paste !== undefined) {
      const lines = parseRosterImport(String(body.paste));
      const result = await importRosterLines(access, slug, lines, body.mode ?? "append");
      if (!result.ok) {
        return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
      }
      return NextResponse.json({ok: true, count: result.count});
    }

    const result = await upsertRosterPlayer(access, slug, {
      num: String(body.num ?? ""),
      name: String(body.name ?? ""),
      pos: String(body.pos ?? ""),
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
