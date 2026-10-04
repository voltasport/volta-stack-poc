"use server";

export async function createShopifyCheckout(
  lines: {merchandiseId: string; quantity: number}[],
) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN ?? "mock.shop";
  const token =
    process.env.SHOPIFY_STOREFRONT_TOKEN ?? "3b580e70970c4528da70c98e097c2fa0";

  const response = await fetch(`https://${domain}/api/2025-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({
      query: `mutation CartCreate($lines: [CartLineInput!]) {
        cartCreate(input: {lines: $lines}) {
          cart { checkoutUrl }
          userErrors { message }
        }
      }`,
      variables: {lines},
    }),
  });

  const json = (await response.json()) as {
    data?: {
      cartCreate?: {
        cart?: {checkoutUrl?: string} | null;
        userErrors?: {message: string}[];
      };
    };
  };
  const checkoutUrl = json.data?.cartCreate?.cart?.checkoutUrl;
  if (!checkoutUrl) {
    throw new Error(
      json.data?.cartCreate?.userErrors?.[0]?.message ??
        "Shopify did not return a checkout",
    );
  }
  return checkoutUrl;
}
