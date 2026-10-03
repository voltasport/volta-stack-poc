"use client";

import {useState} from "react";
import {storeProducts} from "@/lib/data";
import {Shell} from "@/components/shell";

export default function StorePage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const lines = storeProducts.filter((product) => cart[product.id]);
  const total = lines.reduce((sum, product) => sum + product.price * cart[product.id], 0);

  return (
    <Shell>
      <p className="text-sm text-[#6d7b8a]">Team store · local cart only</p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">SLCC GEAR</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#3c4a5c]">
        These products are hardcoded in the Next app. Adding one updates React state in the
        browser. Checkout stays inactive until a payment provider is wired up.
      </p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_280px] gap-4">
        <ul className="grid grid-cols-2 gap-3">
          {storeProducts.map((product) => (
            <li key={product.id} className="rounded-3xl bg-white p-4">
              <div className="grid h-28 place-items-center rounded-2xl bg-[#efeae2] text-xs font-semibold text-[#7b8794]">
                IMG
              </div>
              <p className="mt-3 font-semibold">{product.name}</p>
              <p className="text-xs text-[#6d7b8a]">{product.detail}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-black">${product.price}</p>
                <button
                  type="button"
                  onClick={() =>
                    setCart((current) => ({
                      ...current,
                      [product.id]: (current[product.id] ?? 0) + 1,
                    }))
                  }
                  className="rounded-full bg-[#122033] px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Add
                </button>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-3xl bg-white p-5">
          <h2 className="text-sm font-extrabold tracking-[0.08em]">CART</h2>
          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-[#6d7b8a]">Nothing in the cart yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {lines.map((product) => (
                <li key={product.id} className="flex justify-between">
                  <span>
                    {product.name} × {cart[product.id]}
                  </span>
                  <span>${product.price * cart[product.id]}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex justify-between font-bold">
            <span>Total</span>
            <span>${total}</span>
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-full bg-[#e7e1d6] px-4 py-3 text-sm font-semibold text-[#6d5a32]"
          >
            Checkout
          </button>
          <p className="mt-3 text-xs leading-5 text-[#6d7b8a]">
            Tax, shipping, and card checkout are the Hydrogen proof. Open that shop and add a
            product to reach Shopify checkout.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
