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
    const body = (await request.json()) as {
      sport?: string;
      level?: string;
      season?: string;
      rosterSize?: string | number;
    };
    const sport = String(body.sport ?? "").trim();
    const level = String(body.level ?? "").trim();
    const season = String(body.season ?? "").trim();
    const rosterSize = String(body.rosterSize ?? "").trim();
    if (!sport || !level || !season) {
      return NextResponse.json({error: "Sport, level, and season are required"}, {status: 400});
    }
    const result = await createPortalRequest({
      userId: access.userId,
      type: "program",
      payload: {sport, level, season, rosterSize},
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: 503});
    }
    return NextResponse.json({ok: true, id: result.id});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not submit program request"},
      {status: 400},
    );
  }
}
