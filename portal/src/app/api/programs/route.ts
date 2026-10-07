import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {createProgramForUser} from "@/lib/portal-programs";

export async function POST(request: Request) {
  try {
    const access = await getAccessContext();
    if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    const body = (await request.json()) as {
      name?: string;
      sport?: string;
      levelOrSeason?: string;
      level?: string;
      season?: string;
      rosterSize?: number | string;
      schoolSlug?: string;
    };
    const levelOrSeason = String(body.levelOrSeason ?? body.level ?? body.season ?? "").trim();
    const rosterRaw = body.rosterSize;
    const rosterSize =
      rosterRaw === undefined || rosterRaw === ""
        ? null
        : Number.parseInt(String(rosterRaw), 10);

    const result = await createProgramForUser(access, {
      name: String(body.name ?? ""),
      sport: String(body.sport ?? ""),
      levelOrSeason,
      rosterSize: Number.isFinite(rosterSize) ? rosterSize : null,
      schoolSlug: body.schoolSlug,
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
    }
    return NextResponse.json({ok: true, slug: result.slug});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not create program"},
      {status: 500},
    );
  }
}
