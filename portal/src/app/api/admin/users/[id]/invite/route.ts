import {NextResponse} from "next/server";
import {deliverUserInvite} from "@/lib/admin-users";
import {sql} from "@/lib/db";
import {currentSession} from "@/lib/session";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await currentSession();
    if (session?.user.role !== "admin") {
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
