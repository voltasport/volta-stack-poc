import Link from "next/link";
import {notFound} from "next/navigation";
import {SiteFooter, SiteHeader} from "@/components/site-frame";
import {StoreBrowser} from "@/components/store-browser";
import {entityBySlug, entities, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";

export const dynamic = "force-dynamic";

export default async function StorePage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const entity = entities.find((item) => item.slug === slug);
  if (!entity) notFound();
  const products = productsForEntity(await fetchShopifyProducts(), entity.slug);
  if (products.length === 0) notFound();

  return (
    <div style={{minHeight: "100vh", background: "#F6F4F0"}}>
      <SiteHeader />
      <section style={{padding: "48px 0 80px"}}>
        <div className="wrap">
          <Link href="/stores" style={{textDecoration: "none", fontWeight: 700}}>
            ← All stores
          </Link>
          <h1 className="disp" style={{margin: "12px 0 8px", fontSize: "clamp(56px,7vw,96px)", color: "#101B2D"}}>
            {entityBySlug(slug).name}
          </h1>
          <p style={{color: "#4A5566", marginBottom: 28}}>
            Official gear for this program. Checkout includes tax and Shop Pay where available.
          </p>
          <StoreBrowser name={entity.name} products={products} />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
