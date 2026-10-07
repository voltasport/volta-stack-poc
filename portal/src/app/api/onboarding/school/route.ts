import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {saveOnboardingLogo} from "@/lib/onboarding-uploads";
import {createPortalRequest} from "@/lib/portal-requests";

export async function POST(request: Request) {
  try {
    const access = await getAccessContext();
    if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    if (access.role !== "director" && access.role !== "manager") {
      return NextResponse.json({error: "Forbidden"}, {status: 403});
    }
    const form = await request.formData();
    const schoolName = String(form.get("schoolName") ?? "").trim();
    if (!schoolName) {
      return NextResponse.json({error: "School name is required"}, {status: 400});
    }
    let logoPath: string | null = null;
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const bytes = Buffer.from(await logo.arrayBuffer());
      logoPath = saveOnboardingLogo(access.userId, bytes, logo.type || "application/octet-stream");
    }
    const result = await createPortalRequest({
      userId: access.userId,
      type: "school",
      payload: {schoolName, logoPath},
    });
    if (!result.ok) {
      return NextResponse.json({error: result.error}, {status: 503});
    }
    return NextResponse.json({ok: true, id: result.id});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Could not submit school request"},
      {status: 400},
    );
  }
}
