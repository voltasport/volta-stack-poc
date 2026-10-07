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

  return (
    <>
      <p className="text-sm text-[#6d7b8a]">Team store · {domain}</p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">{heading}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#3c4a5c]">
        Browse products synced from Shopify for planning and merchandising. Purchases happen on
        your public team store, not in this portal.
      </p>
      <div className="mt-6 flex min-w-0 flex-col gap-6">
        {(sections ?? [{name: "", products}]).map((section) => (
          <section key={section.name || "products"}>
            {section.name ? (
              <h2 className="mb-3 text-sm font-extrabold tracking-[0.08em]">{section.name}</h2>
            ) : null}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.products.map((product) => (
                <li key={product.id} className="rounded-3xl bg-white p-4">
                  <div className="grid h-36 place-items-center overflow-hidden rounded-2xl bg-[#efeae2]">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" className="h-36 w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-[#7b8794]">IMG</span>
                    )}
                  </div>
                  <p className="mt-3 font-semibold">{product.title}</p>
                  <p className="text-xs text-[#6d7b8a]">{product.vendor}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-lg font-black">
                      {money(Number(product.price), product.currency)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.available
                          ? "bg-[#e5f6ea] text-[#187243]"
                          : "bg-[#f0ece4] text-[#7b8794]"
                      }`}
                    >
                      {product.available ? "In catalog" : "Unavailable"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
