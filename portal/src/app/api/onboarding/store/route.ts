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
    const body = (await request.json()) as {notes?: string; targetDate?: string};
    const notes = String(body.notes ?? "").trim();
    const targetDate = String(body.targetDate ?? "").trim();
    if (!notes) {
      return NextResponse.json({error: "Tell us what you need for your team store"}, {status: 400});
    }
    const result = await createPortalRequest({
      userId: access.userId,
      type: "store",
      payload: {notes, targetDate: targetDate || null},
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: 503});
    }
    return NextResponse.json({ok: true, id: result.id});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not submit store request"},
      {status: 400},
    );
  }
}
