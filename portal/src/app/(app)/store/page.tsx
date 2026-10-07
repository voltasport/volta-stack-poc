import {Shell} from "@/components/shell";
import {EmptyPage} from "@/components/portal-empty-states";
import {StoreGrid} from "@/components/store-grid";
import {isPendingAccess} from "@/lib/access";
import {allSchools, entities, pendingSchool, productsForEntity} from "@/lib/entities";
import {fetchShopifyProducts} from "@/lib/shopify";
import {loadPortalPage} from "@/lib/page-shell";
import {schoolFilterForStore} from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const {access, entity, shellConfig} = await loadPortalPage();

  if (isPendingAccess(access) || entity.slug === pendingSchool.slug) {
    return (
      <Shell config={shellConfig}>
        <EmptyPage title="Team store">
          <p>Your team store hasn&apos;t been set up yet. Your Volta rep will connect products when your program is ready.</p>
        </EmptyPage>
      </Shell>
    );
  }

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
        <EmptyPage eyebrow={entity.slug === allSchools.slug ? "All schools" : entity.name} title="Team store">
          {entity.slug === allSchools.slug ? (
            <p>No team gear is in the catalog yet. Products will appear here once they are published in Shopify.</p>
          ) : (
            <p>
              No team gear has been set up for {entity.name} yet. Your Volta rep can publish products when your store is ready.
            </p>
          )}
        </EmptyPage>
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
