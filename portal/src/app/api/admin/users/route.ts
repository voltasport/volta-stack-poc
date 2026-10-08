import {NextResponse} from "next/server";
import {createPortalUser, deliverUserInvite} from "@/lib/admin-users";
import {setUserAssignments} from "@/lib/queries";
import {isPortalRole} from "@/lib/roles";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      role?: string;
      programSlugs?: string[];
    };
    const email = String(body.email ?? "").trim();
    const name = String(body.name ?? "").trim();
    const role = String(body.role ?? "director");
    if (!email || !name) {
      return NextResponse.json({error: "Email and name are required"}, {status: 400});
    }
    if (!isPortalRole(role)) {
      return NextResponse.json({error: "Invalid role"}, {status: 400});
    }
    const result = await createPortalUser({email, name, role});
    if (role !== "admin" && body.programSlugs && body.programSlugs.length > 0) {
      await setUserAssignments(result.user.id, body.programSlugs.map(String));
    }
    const invite = await deliverUserInvite({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name ?? name,
      sendEmail: true,
    });
    return NextResponse.json({...result, invite});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Forbidden"},
      {status: 403},
    );
  }
}
