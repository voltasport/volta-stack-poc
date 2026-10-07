import Link from "next/link";
import {SiteFooter, SiteHeader} from "@/components/site-frame";
import {entities, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";
import {portalLoginUrl} from "@/lib/site-urls";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const products = await fetchShopifyProducts();
  const stores = entities
    .map((entity) => ({entity, products: productsForEntity(products, entity.slug)}))
    .filter((store) => store.products.length > 0 || store.entity.programs);

  return (
    <div style={{minHeight: "100vh", background: "#F6F4F0", overflowX: "clip"}}>
      <SiteHeader active="/stores" />
      <section style={{background: "#101B2D", color: "#F6F4F0", padding: "clamp(48px, 8vw, 72px) 0"}}>
        <div className="wrap">
          <p className="eyebrow" style={{color: "#58B077"}}>
            <span className="dot" /> Team stores
          </p>
          <h1 className="disp headline-page" style={{margin: "16px 0 0"}}>
            One link. Every family.
          </h1>
          <p style={{maxWidth: 520, fontSize: 18, lineHeight: 1.5, color: "#B8C2D3"}}>
            Your store, your colors. Families check out securely on your store. Coaches manage programs,
            proofs, and rosters in the program portal.
          </p>
        </div>
      </section>
      <section style={{padding: "64px 0 96px"}}>
        <div className="wrap store-grid">
          {stores.map(({entity, products: gear}) => (
            <article key={entity.slug} className="store-card" style={{background: "#fff", borderRadius: 24, padding: 24}}>
              <span className="tag tag-live">{entity.programs ? "Program portal + store" : "Team store"}</span>
              <h2 className="disp store-card-title" style={{color: "#101B2D", margin: "16px 0 8px"}}>
                {entity.name}
              </h2>
              <p style={{color: "#4A5566", minHeight: 48, margin: 0}}>
                {gear.length > 0
                  ? `${gear.length} items in this team store.`
                  : "Gear orders run through the program portal until your store catalog is live here."}
              </p>
              <div style={{display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16}}>
                {gear.length > 0 ? (
                  <Link className="btn btn-n" href={`/stores/${entity.slug}`} style={{minHeight: 44}}>
                    Shop
                  </Link>
                ) : null}
                {entity.programs ? (
                  <a className="btn btn-g" href={portalLoginUrl} style={{minHeight: 44}}>
                    Program portal
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
