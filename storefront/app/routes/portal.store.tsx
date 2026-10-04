import {Await, useLoaderData, useRouteLoaderData} from 'react-router';
import {Suspense} from 'react';
import {Money} from '@shopify/hydrogen';
import type {Route} from './+types/portal.store';
import type {RootLoader} from '~/root';
import {AddToCartButton} from '~/components/AddToCartButton';
import {PortalShell} from '~/components/portal/PortalShell';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Volta | Team store'}];
};

export async function loader({context}: Route.LoaderArgs) {
  const {products} = await context.storefront.query(STORE_PRODUCTS_QUERY);
  return {
    products: products.nodes,
    storeDomain: context.env.PUBLIC_STORE_DOMAIN || 'mock.shop',
  };
}

export default function PortalStore() {
  const {products, storeDomain} = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');

  return (
    <PortalShell>
      <p className="text-sm text-[#6d7b8a]">Team store · {storeDomain || 'Shopify'}</p>
      <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">SLCC GEAR</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#3c4a5c]">
        These products are live from the Shopify catalog. Adding one writes a Shopify cart.
        Checkout opens Shopify when you are ready to pay.
      </p>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_300px] gap-4">
        <ul className="grid grid-cols-2 gap-3">
          {products.map((product) => {
            const variant = product.selectedOrFirstAvailableVariant;
            return (
              <li key={product.id} className="rounded-3xl bg-white p-4">
                <div className="grid h-36 place-items-center overflow-hidden rounded-2xl bg-[#efeae2]">
                  {product.featuredImage ? (
                    <img
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText || product.title}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-[#7b8794]">IMG</span>
                  )}
                </div>
                <p className="mt-3 font-semibold">{product.title}</p>
                <p className="text-xs text-[#6d7b8a]">{product.vendor}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-lg font-black">
                    <Money data={product.priceRange.minVariantPrice} />
                  </p>
                  <AddToCartButton
                    disabled={!variant?.availableForSale}
                    lines={
                      variant
                        ? [{merchandiseId: variant.id, quantity: 1}]
                        : []
                    }
                  >
                    <span className="rounded-full bg-[#122033] px-3 py-1.5 text-sm font-semibold text-white">
                      {variant?.availableForSale ? 'Add' : 'Sold out'}
                    </span>
                  </AddToCartButton>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="h-fit rounded-3xl bg-white p-5">
          <h2 className="text-sm font-extrabold tracking-[0.08em]">CART</h2>
          <Suspense fallback={<p className="mt-3 text-sm text-[#6d7b8a]">Loading cart…</p>}>
            <Await resolve={root?.cart}>
              {(cart) => <CartSummary cart={cart} />}
            </Await>
          </Suspense>
        </aside>
      </div>
    </PortalShell>
  );
}

function CartSummary({cart}: {cart: CartApiQueryFragment | null}) {
  const lines = cart?.lines?.nodes ?? [];
  if (!cart || lines.length === 0) {
    return <p className="mt-3 text-sm text-[#6d7b8a]">Nothing in the Shopify cart yet.</p>;
  }
  return (
    <div>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {lines.map((line) => (
          <li key={line.id} className="flex justify-between gap-3">
            <span>
              {line.merchandise.product.title} × {line.quantity}
            </span>
            <Money data={line.cost.totalAmount} />
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between font-bold">
        <span>Total</span>
        {cart.cost?.totalAmount ? <Money data={cart.cost.totalAmount} /> : null}
      </p>
      <a
        href={cart.checkoutUrl}
        className="mt-4 block rounded-full bg-[#122033] px-4 py-3 text-center text-sm font-semibold text-white no-underline"
      >
        Continue in Shopify
      </a>
    </div>
  );
}

const STORE_PRODUCTS_QUERY = `#graphql
  query StoreProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        vendor
        featuredImage {
          id
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        selectedOrFirstAvailableVariant {
          id
          availableForSale
        }
      }
    }
  }
` as const;
