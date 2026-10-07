import {NextResponse} from "next/server";
import {getAccessContext} from "@/lib/access";
import {canReadPortalUpload, getPortalUpload} from "@/lib/portal-uploads";

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }
  const {id} = await params;
  const upload = await getPortalUpload(id);
  if (!upload) {
    return NextResponse.json({error: "Not found"}, {status: 404});
  }
  if (!(await canReadPortalUpload(upload, access))) {
    return NextResponse.json({error: "Forbidden"}, {status: 403});
  }
  const body = Buffer.isBuffer(upload.data) ? upload.data : Buffer.from(upload.data);
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": upload.content_type,
      "Content-Length": String(upload.byte_size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
