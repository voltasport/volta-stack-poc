import {Shell} from "@/components/shell";
import {StoreGrid} from "@/components/store-grid";
import {currentEntity} from "@/lib/current-entity";
import {allSchools, entities, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const entity = await currentEntity();
  const {domain, products} = await fetchShopifyProducts();
  const mine = productsForEntity(products, entity.slug);
  const sections =
    entity.slug === allSchools.slug
      ? entities
          .map((school) => ({
            name: `${school.name} · ${productsForEntity(products, school.slug).length}`,
            products: productsForEntity(products, school.slug),
          }))
          .filter((section) => section.products.length > 0)
      : undefined;

  return (
    <Shell>
      {mine.length === 0 ? (
        <div>
          <p className="text-sm text-[#6d7b8a]">{entity.name}</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">TEAM STORE</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#3c4a5c]">
            Nothing in the Shopify catalog is filed under {entity.name}. Davis High School gear is
            the live retail catalog, on the marketing site.
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
