import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {assertCanEditProgramRoster, importRosterCsvRows} from "@/lib/portal-programs";
import {
  MAX_ROSTER_CSV_CHARS,
  previewRosterCsv,
  ROSTER_CSV_TEMPLATE,
  ROSTER_CSV_TOO_LARGE,
  rosterCsvSizeError,
} from "@/lib/roster-csv";

/** Raw request cap (CSV text plus JSON/multipart overhead). */
const MAX_REQUEST_BYTES = MAX_ROSTER_CSV_CHARS * 2;

export async function GET() {
  return new NextResponse(ROSTER_CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="roster-template.csv"',
    },
  });
}

export async function POST(
  request: Request,
  {params}: {params: Promise<{slug: string}>},
) {
  try {
    const access = await getAccessContext();
    if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    const {slug} = await params;

    if (!(await assertCanEditProgramRoster(access, slug))) {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({error: ROSTER_CSV_TOO_LARGE}, {status: 413});
    }

    const contentType = request.headers.get("content-type") ?? "";
    let text = "";
    let mode: "append" | "replace" = "append";
    let action: "preview" | "commit" = "preview";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      text = String(form.get("text") ?? form.get("paste") ?? "");
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_REQUEST_BYTES) {
          return NextResponse.json({error: ROSTER_CSV_TOO_LARGE}, {status: 413});
        }
        text = await file.text();
      }
      mode = String(form.get("mode") ?? "append") === "replace" ? "replace" : "append";
      action = String(form.get("action") ?? "preview") === "commit" ? "commit" : "preview";
    } else {
      const body = (await request.json()) as {
        text?: string;
        paste?: string;
        mode?: "append" | "replace";
        action?: "preview" | "commit";
      };
      text = String(body.text ?? body.paste ?? "");
      mode = body.mode === "replace" ? "replace" : "append";
      action = body.action === "commit" ? "commit" : "preview";
    }

    if (!text.trim()) {
      return NextResponse.json({error: "Add CSV text or upload a file."}, {status: 400});
    }

    const sizeError = rosterCsvSizeError(text);
    if (sizeError) {
      return NextResponse.json({error: sizeError}, {status: 413});
    }

    const preview = previewRosterCsv(text);
    if (action === "preview") {
      return NextResponse.json(preview);
    }

    if (!preview.canSave) {
      return NextResponse.json(
        {...preview, error: preview.error ?? "Fix validation errors before saving."},
        {status: 400},
      );
    }

    const validRows = preview.rows.filter((row) => row.ok);
    const result = await importRosterCsvRows(access, slug, validRows, mode);
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
    }
    return NextResponse.json({ok: true, count: result.count, mode});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not import roster"},
      {status: 500},
    );
  }
}
