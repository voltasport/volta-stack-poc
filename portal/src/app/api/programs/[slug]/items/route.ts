import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {addKitItem, applyKitPreset, deleteKitItem, updateKitItem} from "@/lib/program-kit-items";

type Params = {params: Promise<{slug: string}>};

async function readBody(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function respond(result: {ok: boolean; error?: string}) {
  if (result.ok) return NextResponse.json({ok: true});
  const status = result.error === "Forbidden" ? 403 : result.error === "Item not found." ? 404 : 400;
  return NextResponse.json({error: result.error}, {status});
}

/** Add a kit item ({name, sizeOptions}) or apply a preset ({presetId}). */
export async function POST(request: Request, {params}: Params) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const body = await readBody(request);
  if (typeof body.presetId === "string") {
    return respond(await applyKitPreset(access, slug, body.presetId));
  }
  return respond(await addKitItem(access, slug, {name: body.name, sizeOptions: body.sizeOptions}));
}

export async function PATCH(request: Request, {params}: Params) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const body = await readBody(request);
  return respond(
    await updateKitItem(access, slug, body.id, {name: body.name, sizeOptions: body.sizeOptions}),
  );
}

export async function DELETE(request: Request, {params}: Params) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const body = await readBody(request);
  return respond(await deleteKitItem(access, slug, body.id));
}
