import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {isPortalRole} from "@/lib/roles";
import {setUserAssignments, setUserRole} from "@/lib/queries";

export async function PATCH(
  request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const access = await getAccessContext();
  if (!access || access.role !== "admin") {
    return NextResponse.json({error: "Forbidden"}, {status: 403});
  }
  const {id} = await params;
  const body = (await request.json()) as {role?: string; programSlugs?: string[]};
  if (body.role !== undefined) {
    if (!isPortalRole(body.role)) {
      return NextResponse.json({error: "Invalid role"}, {status: 400});
    }
    if (id === access.userId && body.role !== "admin") {
      return NextResponse.json({error: "Cannot demote your own admin account"}, {status: 400});
    }
    await setUserRole(id, body.role);
  }
  if (body.programSlugs) {
    await setUserAssignments(id, body.programSlugs);
  }
  return NextResponse.json({ok: true});
}
