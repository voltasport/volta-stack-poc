import {createShopifyCheckout} from "@/lib/checkout";
import {publicApiCorsHeaders, publicApiOptionsResponse} from "@/lib/public-api-cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

export async function POST(request: Request) {
  const cors = publicApiCorsHeaders(request);
  try {
    const lines = (await request.json()) as {merchandiseId?: string; quantity?: number}[];
    if (!Array.isArray(lines) || lines.some((line) => !line.merchandiseId || !line.quantity)) {
      return Response.json({error: "Invalid cart"}, {status: 400, headers: cors});
    }
    const checkoutUrl = await createShopifyCheckout(
      lines.map((line) => ({
        merchandiseId: String(line.merchandiseId),
        quantity: Number(line.quantity),
      })),
    );
    return Response.json({checkoutUrl}, {headers: cors});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return Response.json({error: message}, {status: 500, headers: cors});
  }
}
