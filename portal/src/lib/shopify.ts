export type ShopifyProduct = {
  id: string;
  title: string;
  vendor: string;
  image: string | null;
  price: string;
  currency: string;
  variantId: string | null;
  available: boolean;
};

const QUERY = `
  query StoreProducts {
    products(first: 50, sortKey: TITLE) {
      nodes {
        id
        title
        vendor
        featuredImage { url }
        priceRange { minVariantPrice { amount currencyCode } }
        selectedOrFirstAvailableVariant { id availableForSale }
      }
    }
  }
`;

import {getStorefrontCredentials} from "@/lib/shopify-storefront";

export async function fetchShopifyProducts(): Promise<{
  domain: string;
  products: ShopifyProduct[];
}> {
  const {domain, token} = getStorefrontCredentials();

  const response = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({query: QUERY}),
    next: {revalidate: 60},
  });

  if (!response.ok) {
    throw new Error(`Shopify catalog request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    data?: {
      products: {
        nodes: Array<{
          id: string;
          title: string;
          vendor: string;
          featuredImage: {url: string} | null;
          priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
          selectedOrFirstAvailableVariant: {
            id: string;
            availableForSale: boolean;
          } | null;
        }>;
      };
    };
  };

  const products = (json.data?.products.nodes ?? []).map((product) => ({
    id: product.id,
    title: product.title,
    vendor: product.vendor,
    image: product.featuredImage?.url ?? null,
    price: Number(product.priceRange.minVariantPrice.amount).toFixed(0),
    currency: product.priceRange.minVariantPrice.currencyCode,
    variantId: product.selectedOrFirstAvailableVariant?.id ?? null,
    available: product.selectedOrFirstAvailableVariant?.availableForSale ?? false,
  }));

  return {domain, products};
}
