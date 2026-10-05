import {fetchShopifyProducts} from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  const {products} = await fetchShopifyProducts();
  return Response.json(products);
}
