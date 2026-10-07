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
    <div style={{minHeight: "100vh", background: "#F6F4F0", overflowX: "clip"}}>
      <SiteHeader active="/stores" />
      <section style={{padding: "48px 0 80px"}}>
        <div className="wrap" style={{minWidth: 0}}>
          <Link href="/stores" className="link-muted" style={{fontWeight: 700}}>
            ← All stores
          </Link>
          <h1 className="disp headline-page" style={{margin: "12px 0 8px", color: "#101B2D"}}>
            {entityBySlug(slug).name}
          </h1>
          <p style={{color: "#4A5566", marginBottom: 28, maxWidth: 640}}>
            Official gear for this program. Checkout includes tax and Shop Pay where available.
          </p>
          <StoreBrowser name={entity.name} products={products} />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
