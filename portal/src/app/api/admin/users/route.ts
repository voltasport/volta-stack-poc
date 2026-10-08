import {NextResponse} from "next/server";
import {createPortalUser, deliverUserInvite} from "@/lib/admin-users";
import {sql} from "@/lib/db";
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
    if (role !== "admin" && Array.isArray(body.programSlugs) && body.programSlugs.length > 0) {
      const requested = [...new Set(body.programSlugs.map(String))].slice(0, 200);
      const existing = (await sql().query(`select slug from programs where slug = any($1::text[])`, [
        requested,
      ])) as {slug: string}[];
      await setUserAssignments(
        result.user.id,
        existing.map((row) => row.slug),
      );
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
