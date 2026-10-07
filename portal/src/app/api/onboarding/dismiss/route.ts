import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {dismissOnboardingChecklist} from "@/lib/portal-invites";

export async function POST() {
  try {
    const access = await getAccessContext();
    if (!access) {
      return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
    if (access.role !== "director" && access.role !== "manager") {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }
    await dismissOnboardingChecklist(access.userId);
    return NextResponse.json({ok: true});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not dismiss checklist"},
      {status: 400},
    );
  }
}
