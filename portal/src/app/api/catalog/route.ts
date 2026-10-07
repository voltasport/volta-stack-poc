import {fetchShopifyProducts} from "@/lib/shopify";
import {publicApiCorsHeaders, publicApiOptionsResponse} from "@/lib/public-api-cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

export async function GET(request: Request) {
  const cors = publicApiCorsHeaders(request);
  try {
    const {products} = await fetchShopifyProducts();
    return Response.json(products, {headers: cors});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog unavailable";
    return Response.json({error: message}, {status: 500, headers: cors});
  }
}
