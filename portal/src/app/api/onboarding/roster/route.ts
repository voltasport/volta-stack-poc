import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {createPortalRequest} from "@/lib/portal-requests";

export async function POST(request: Request) {
  try {
    const access = await getAccessContext();
    if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    if (access.role !== "director" && access.role !== "manager") {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }
    const form = await request.formData();
    const paste = String(form.get("paste") ?? "").trim();
    const file = form.get("file");
    let rosterText = paste;
    let fileName: string | null = null;
    if (file instanceof File && file.size > 0) {
      rosterText = await file.text();
      fileName = file.name;
    }
    if (!rosterText.trim()) {
      return NextResponse.json({error: "Paste a roster or upload a CSV file"}, {status: 400});
    }
    if (rosterText.length > 200_000) {
      return NextResponse.json({error: "Roster is too large (max 200 KB)"}, {status: 400});
    }
    const result = await createPortalRequest({
      userId: access.userId,
      type: "roster",
      payload: {fileName, rosterText},
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: 503});
    }
    return NextResponse.json({ok: true, id: result.id});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not submit roster"},
      {status: 400},
    );
  }
}
