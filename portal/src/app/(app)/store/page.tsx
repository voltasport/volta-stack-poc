import {Shell} from "@/components/shell";
import {StoreGrid} from "@/components/store-grid";
import {allSchools, entities, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";
import {loadPortalPage} from "@/lib/page-shell";
import {schoolFilterForStore} from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const {access, entity, shellConfig} = await loadPortalPage();
  schoolFilterForStore(access, entity.slug);
  const {domain, products} = await fetchShopifyProducts();
  const mine = productsForEntity(products, entity.slug);
  const visibleSchools = access.canSeeAllSchools ? entities : access.entities;
  const sections =
    entity.slug === allSchools.slug
      ? visibleSchools
          .map((school) => ({
            name: `${school.name} · ${productsForEntity(products, school.slug).length}`,
            products: productsForEntity(products, school.slug),
          }))
          .filter((section) => section.products.length > 0)
      : undefined;

  return (
    <Shell config={shellConfig}>
      {mine.length === 0 ? (
        <div>
          <p className="text-sm text-[#6d7b8a]">{entity.name}</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">TEAM STORE</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#3c4a5c]">
            Nothing in the Shopify catalog is filed under {entity.name} for your account.
          </p>
        </div>
      ) : (
        <StoreGrid
          domain={domain}
          products={mine}
          heading={entity.slug === allSchools.slug ? "All schools" : `${entity.name} gear`}
          sections={sections}
        />
      )}
    </Shell>
  );
}
