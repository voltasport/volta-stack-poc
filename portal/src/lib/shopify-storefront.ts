/** Shared Storefront API credentials (env only — no tokens in git). */
export function getStorefrontCredentials() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN ?? "mock.shop";
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "SHOPIFY_STOREFRONT_TOKEN is not set. Configure it in the deployment environment.",
    );
  }
  return {domain, token};
}
