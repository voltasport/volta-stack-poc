import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {
  addProgramSizedItem,
  canEditProgramSizedItems,
  deleteProgramSizedItem,
  loadProgramSizedItems,
  updateProgramSizedItem,
} from "@/lib/program-sized-items";

export async function GET(_request: Request, {params}: {params: Promise<{slug: string}>}) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const items = await loadProgramSizedItems(slug);
  return NextResponse.json({items, canEdit: canEditProgramSizedItems(access, slug)});
}

export async function POST(request: Request, {params}: {params: Promise<{slug: string}>}) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const body = (await request.json()) as {name?: string; sizeOptions?: string[]};
  const result = await addProgramSizedItem(access, slug, {
    name: String(body.name ?? ""),
    sizeOptions: (body.sizeOptions ?? []).map(String),
  });
  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
  }
  return NextResponse.json({ok: true});
}

export async function PATCH(request: Request, {params}: {params: Promise<{slug: string}>}) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const body = (await request.json()) as {
    id?: number;
    name?: string;
    sizeOptions?: string[];
    sortOrder?: number;
  };
  if (!body.id) return NextResponse.json({error: "Item id is required."}, {status: 400});
  const result = await updateProgramSizedItem(access, slug, body.id, {
    name: body.name,
    sizeOptions: body.sizeOptions?.map(String),
    sortOrder: body.sortOrder,
  });
  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
  }
  return NextResponse.json({ok: true});
}

export async function DELETE(request: Request, {params}: {params: Promise<{slug: string}>}) {
  const access = await getAccessContext();
  if (!access) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const {slug} = await params;
  const body = (await request.json()) as {id?: number};
  if (!body.id) return NextResponse.json({error: "Item id is required."}, {status: 400});
  const result = await deleteProgramSizedItem(access, slug, body.id);
  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: result.error === "Forbidden" ? 403 : 400});
  }
  return NextResponse.json({ok: true});
}
