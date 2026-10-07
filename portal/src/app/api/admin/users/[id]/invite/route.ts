import {NextResponse} from "next/server";
import {generatePasswordResetLink} from "@/lib/admin-users";
import {sql} from "@/lib/db";
import {currentSession} from "@/lib/session";

export async function POST(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await currentSession();
    if (session?.user.role !== "admin") {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }
    const {id} = await params;
    const rows = (await sql().query(`select email from "user" where id = $1`, [id])) as {
      email: string;
    }[];
    const email = rows[0]?.email;
    if (!email) {
      return NextResponse.json({error: "User not found"}, {status: 404});
    }
    const url = await generatePasswordResetLink(email);
    return NextResponse.json({url});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not create link"},
      {status: 400},
    );
  }
}
