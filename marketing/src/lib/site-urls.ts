/** Production URLs — set NEXT_PUBLIC_PORTAL_URL in deploy when the portal host differs. */
const DEFAULT_PORTAL = "https://app.voltasport.co";

function normalizeBase(url: string) {
  return url.replace(/\/$/, "");
}

export const portalApiOrigin = normalizeBase(
  process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.PORTAL_ORIGIN ?? DEFAULT_PORTAL,
);

export const portalLoginUrl = `${portalApiOrigin}/login`;
