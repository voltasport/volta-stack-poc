import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {completePortalRequest} from "@/lib/portal-requests";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const access = await getAccessContext();
    if (!access || access.role !== "admin") {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }
    const {id} = await params;
    const body = (await request.json()) as {adminNotes?: string};
    const result = await completePortalRequest({
      requestId: id,
      adminUserId: access.userId,
      adminNotes: body.adminNotes,
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: 400});
    }
    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Forbidden"},
      {status: 403},
    );
  }
}
