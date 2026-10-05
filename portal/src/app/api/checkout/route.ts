import {createShopifyCheckout} from "@/lib/checkout";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const lines = (await request.json()) as {merchandiseId?: string; quantity?: number}[];
  if (!Array.isArray(lines) || lines.some((line) => !line.merchandiseId || !line.quantity)) {
    return Response.json({error: "Invalid cart"}, {status: 400});
  }
  const checkoutUrl = await createShopifyCheckout(
    lines.map((line) => ({
      merchandiseId: String(line.merchandiseId),
      quantity: Number(line.quantity),
    })),
  );
  return Response.json({checkoutUrl});
}
