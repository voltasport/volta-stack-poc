"use server";

import {portalApiOrigin} from "@/lib/site-urls";

export async function createShopifyCheckout(lines: {merchandiseId: string; quantity: number}[]) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) {
    const origin = portalApiOrigin;
    const response = await fetch(`${origin}/api/checkout`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(lines),
    });
    const json = (await response.json()) as {checkoutUrl?: string; error?: string};
    if (!json.checkoutUrl) throw new Error(json.error ?? "Checkout could not be created");
    return json.checkoutUrl;
  }

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
      json.data?.cartCreate?.userErrors?.[0]?.message ?? "Checkout could not be created",
    );
  }
  return checkoutUrl;
}
