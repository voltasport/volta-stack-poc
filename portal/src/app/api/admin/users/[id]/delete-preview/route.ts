import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {previewDeletePortalUser} from "@/lib/delete-portal-user";

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const access = await getAccessContext();
  if (!access || access.role !== "admin") {
    return NextResponse.json({error: "Forbidden"}, {status: 403});
  }
  const {id} = await params;
  const preview = await previewDeletePortalUser(id);
  if (!preview.ok) {
    return NextResponse.json({error: preview.error}, {status: 404});
  }
  return NextResponse.json(preview);
}
