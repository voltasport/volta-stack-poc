import Link from "next/link";
import {SiteFooter, SiteHeader} from "@/components/site-frame";
import {entities, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";

export const dynamic = "force-dynamic";

const PORTAL = "https://voltasport.vercel.app/login";

export default async function StoresPage() {
  const products = await fetchShopifyProducts();
  const stores = entities
    .map((entity) => ({entity, products: productsForEntity(products, entity.slug)}))
    .filter((store) => store.products.length > 0 || store.entity.programs);

  return (
    <div style={{minHeight: "100vh", background: "#F6F4F0"}}>
      <SiteHeader />
      <section style={{background: "#101B2D", color: "#F6F4F0", padding: "72px 0"}}>
        <div className="wrap">
          <p className="eyebrow" style={{color: "#58B077"}}>
            <span className="dot" /> Team stores
          </p>
          <h1 className="disp" style={{margin: "16px 0 0", fontSize: "clamp(64px,8vw,120px)"}}>
            One link. Every family.
          </h1>
          <p style={{maxWidth: 520, fontSize: 18, lineHeight: 1.5, color: "#B8C2D3"}}>
            Your store, your colors. Checkout stays on Shopify. The director workspace for programs
            and proofs is a separate login.
          </p>
        </div>
      </section>
      <section style={{padding: "64px 0 96px"}}>
        <div className="wrap" style={{display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16}}>
          {stores.map(({entity, products: gear}) => (
            <article key={entity.slug} style={{background: "#fff", borderRadius: 24, padding: 24}}>
              <span className="tag tag-live">{entity.programs ? "Portal + store" : "Team store"}</span>
              <h2 className="disp" style={{fontSize: 40, color: "#101B2D", margin: "16px 0 8px"}}>
                {entity.name}
              </h2>
              <p style={{color: "#4A5566", minHeight: 48}}>
                {gear.length > 0
                  ? `${gear.length} products in the Shopify catalog.`
                  : "No retail products filed here yet. Programs and proofs live in the director portal."}
              </p>
              <div style={{display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16}}>
                {gear.length > 0 ? (
                  <Link className="btn btn-n" href={`/stores/${entity.slug}`} style={{minHeight: 44}}>
                    Shop
                  </Link>
                ) : null}
                {entity.programs ? (
                  <a className="btn btn-g" href={PORTAL} style={{minHeight: 44}}>
                    Director login
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
