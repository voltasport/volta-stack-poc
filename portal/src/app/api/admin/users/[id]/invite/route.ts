import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {deliverUserInvite} from "@/lib/admin-users";
import {sql} from "@/lib/db";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const access = await getAccessContext();
    if (!access || access.role !== "admin") {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }
    const {id} = await params;
    const body = (await request.json().catch(() => ({}))) as {sendEmail?: boolean};
    const rows = (await sql().query(`select id, email, name from "user" where id = $1`, [id])) as {
      id: string;
      email: string;
      name: string;
    }[];
    const user = rows[0];
    if (!user) {
      return NextResponse.json({error: "User not found"}, {status: 404});
    }
    const invite = await deliverUserInvite({
      userId: user.id,
      email: user.email,
      name: user.name,
      sendEmail: body.sendEmail !== false,
    });
    return NextResponse.json(invite);
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not create link"},
      {status: 400},
    );
  }
}
