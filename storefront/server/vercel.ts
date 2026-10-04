import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {waitUntil} from '@vercel/functions';
import * as serverBuild from 'virtual:react-router/server-build';
import {createHydrogenRouterContext} from '~/lib/context';

const env = {
  SESSION_SECRET: process.env.SESSION_SECRET || 'volta-poc-session',
  PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN || 'mock.shop',
  PUBLIC_STOREFRONT_API_TOKEN:
    process.env.PUBLIC_STOREFRONT_API_TOKEN ||
    '3b580e70970c4528da70c98e097c2fa0',
  PRIVATE_STOREFRONT_API_TOKEN:
    process.env.PRIVATE_STOREFRONT_API_TOKEN || '',
  PUBLIC_STOREFRONT_ID: process.env.PUBLIC_STOREFRONT_ID || '0',
  PUBLIC_CHECKOUT_DOMAIN: process.env.PUBLIC_CHECKOUT_DOMAIN || 'mock.shop',
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID:
    process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || 'poc',
  PUBLIC_CUSTOMER_ACCOUNT_API_URL:
    process.env.PUBLIC_CUSTOMER_ACCOUNT_API_URL ||
    'https://shopify.com/authentication/0',
  SHOP_ID: process.env.SHOP_ID || '0',
} as Env;

export default async function handleVercelRequest(request: Request) {
  const executionContext = {
    waitUntil,
    passThroughOnException() {},
  } as ExecutionContext;

  try {
    const hydrogenContext = await createHydrogenRouterContext(
      request,
      env,
      executionContext,
    );

    const handleRequest = createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);

    if (hydrogenContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
    }

    if (response.status === 404) {
      return storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront,
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    return new Response('An unexpected error occurred', {status: 500});
  }
}
