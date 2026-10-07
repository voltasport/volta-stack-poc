"use client";

import {useState} from "react";
import {createShopifyCheckout} from "@/lib/checkout";
import type {ShopifyProduct} from "@/lib/shopify";

export function StoreGrid({
  domain,
  products,
  heading = "SLCC GEAR",
  sections,
}: {
  domain: string;
  products: ShopifyProduct[];
  heading?: string;
  sections?: {name: string; products: ShopifyProduct[]}[];
}) {
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const lines = products.filter((product) => cart[product.id]);
  const total = lines.reduce(
    (sum, product) => sum + Number(product.price) * cart[product.id],
    0,
  );

  return (
    <>
      <p className="text-sm text-[#6d7b8a]">Team store · {domain}</p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">{heading}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#3c4a5c]">
        Products are loaded from your Shopify catalog. Continue in Shopify to complete checkout
        securely.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-6">
          {(sections ?? [{name: "", products}]).map((section) => (
            <section key={section.name || "products"}>
              {section.name ? (
                <h2 className="mb-3 text-sm font-extrabold tracking-[0.08em]">{section.name}</h2>
              ) : null}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {section.products.map((product) => (
            <li key={product.id} className="rounded-3xl bg-white p-4">
              <div className="grid h-36 place-items-center overflow-hidden rounded-2xl bg-[#efeae2]">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-[#7b8794]">IMG</span>
                )}
              </div>
              <p className="mt-3 font-semibold">{product.title}</p>
              <p className="text-xs text-[#6d7b8a]">{product.vendor}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-black">
                  {money(Number(product.price), product.currency)}
                </p>
                <button
                  type="button"
                  disabled={!product.available || !product.variantId}
                  onClick={() =>
                    setCart((current) => ({
                      ...current,
                      [product.id]: (current[product.id] ?? 0) + 1,
                    }))
                  }
                  className="rounded-full bg-[#122033] px-3 py-1.5 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
                >
                  {product.available ? "Add" : "Sold out"}
                </button>
              </div>
            </li>
          ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="h-fit rounded-3xl bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-extrabold tracking-[0.08em]">CART</h2>
          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-[#6d7b8a]">Nothing in the cart yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {lines.map((product) => (
                <li key={product.id} className="flex justify-between gap-3">
                  <span>
                    {product.title} × {cart[product.id]}
                  </span>
                  <span>
                    {money(
                      Number(product.price) * cart[product.id],
                      product.currency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex justify-between font-bold">
            <span>Total</span>
            <span>{money(total, lines[0]?.currency ?? products[0]?.currency ?? "USD")}</span>
          </p>
          <button
            type="button"
            disabled={lines.length === 0 || checkingOut}
            onClick={async () => {
              setCheckoutError(null);
              setCheckingOut(true);
              try {
                const checkoutUrl = await createShopifyCheckout(
                  lines.flatMap((product) =>
                    product.variantId
                      ? [
                          {
                            merchandiseId: product.variantId,
                            quantity: cart[product.id],
                          },
                        ]
                      : [],
                  ),
                );
                window.location.assign(checkoutUrl);
              } catch (error) {
                setCheckoutError(
                  error instanceof Error
                    ? error.message
                    : "Could not open Shopify checkout",
                );
                setCheckingOut(false);
              }
            }}
            className="mt-4 block w-full rounded-full bg-[#122033] px-4 py-3 text-center text-sm font-semibold text-white disabled:bg-[#c5ced6]"
          >
            {checkingOut ? "Opening Shopify…" : "Continue in Shopify"}
          </button>
          {checkoutError ? (
            <p className="mt-3 text-xs leading-5 text-[#9a3b3b]">{checkoutError}</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
