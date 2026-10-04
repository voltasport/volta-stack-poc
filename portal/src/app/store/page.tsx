import {Shell} from "@/components/shell";
import {StoreGrid} from "@/components/store-grid";
import {fetchShopifyProducts} from "@/lib/shopify";

export default async function StorePage() {
  const {domain, products} = await fetchShopifyProducts();

  return (
    <Shell>
      <StoreGrid domain={domain} products={products} />
    </Shell>
  );
}
