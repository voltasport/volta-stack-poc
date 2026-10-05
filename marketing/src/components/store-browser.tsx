"use client";

import {useState} from "react";
import {createShopifyCheckout} from "@/lib/checkout";
import type {ShopifyProduct} from "@/lib/shopify";

export function StoreBrowser({
  name,
  products,
}: {
  name: string;
  products: ShopifyProduct[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const lines = products.filter((product) => cart[product.id]);
  const currency = products[0]?.currency ?? "USD";
  const money = (amount: number) =>
    new Intl.NumberFormat("en-US", {style: "currency", currency, maximumFractionDigits: 0}).format(amount);
  const total = lines.reduce((sum, product) => sum + Number(product.price) * cart[product.id], 0);

  return (
    <div style={{display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 16}}>
      <ul style={{display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, listStyle: "none", margin: 0, padding: 0}}>
        {products.map((product) => (
          <li key={product.id} style={{background: "#fff", borderRadius: 24, padding: 16}}>
            <div className="ph ph-l" style={{height: 180, borderRadius: 16, overflow: "hidden", padding: 0}}>
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
              ) : (
                product.title
              )}
            </div>
            <p style={{margin: "14px 0 0", fontWeight: 700}}>{product.title}</p>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12}}>
              <span className="disp" style={{fontSize: 32, color: "#101B2D"}}>
                {money(Number(product.price))}
              </span>
              <button
                type="button"
                className="btn btn-n"
                style={{minHeight: 40, padding: "0 16px"}}
                disabled={!product.available || !product.variantId}
                onClick={() =>
                  setCart((current) => ({...current, [product.id]: (current[product.id] ?? 0) + 1}))
                }
              >
                {product.available ? "Add" : "Sold out"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <aside style={{background: "#101B2D", color: "#F6F4F0", borderRadius: 24, padding: 20, height: "fit-content"}}>
        <h2 className="disp" style={{fontSize: 28, margin: 0}}>
          Cart
        </h2>
        <p style={{color: "#B8C2D3", fontSize: 13}}>{name}</p>
        {lines.length === 0 ? (
          <p style={{color: "#B8C2D3"}}>Nothing in the cart yet.</p>
        ) : (
          <ul style={{listStyle: "none", margin: "16px 0", padding: 0, display: "flex", flexDirection: "column", gap: 8}}>
            {lines.map((product) => (
              <li key={product.id} style={{display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14}}>
                <span>
                  {product.title} × {cart[product.id]}
                </span>
                <span>{money(Number(product.price) * cart[product.id])}</span>
              </li>
            ))}
          </ul>
        )}
        <p style={{display: "flex", justifyContent: "space-between", fontWeight: 700}}>
          <span>Total</span>
          <span>{money(total)}</span>
        </p>
        <button
          type="button"
          className="btn btn-g"
          style={{width: "100%", marginTop: 16}}
          disabled={lines.length === 0 || checkingOut}
          onClick={async () => {
            setCheckoutError(null);
            setCheckingOut(true);
            try {
              const checkoutUrl = await createShopifyCheckout(
                lines.flatMap((product) =>
                  product.variantId
                    ? [{merchandiseId: product.variantId, quantity: cart[product.id]}]
                    : [],
                ),
              );
              window.location.assign(checkoutUrl);
            } catch (error) {
              setCheckoutError(error instanceof Error ? error.message : "Could not open Shopify checkout");
              setCheckingOut(false);
            }
          }}
        >
          {checkingOut ? "Opening Shopify…" : "Continue in Shopify"}
        </button>
        {checkoutError ? <p style={{color: "#f0b4b4", fontSize: 13}}>{checkoutError}</p> : null}
      </aside>
    </div>
  );
}
