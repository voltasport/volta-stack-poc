import {NextResponse} from "next/server";
import {createPortalUser} from "@/lib/admin-users";
import {isPortalRole} from "@/lib/roles";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {email?: string; name?: string; role?: string};
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
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Forbidden"},
      {status: 403},
    );
  }
}
