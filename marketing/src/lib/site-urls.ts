/** Production URLs — override with env in deploy. API host may differ from public login host. */
function normalizeBase(url: string) {
  return url.replace(/\/$/, "");
}

/** User-facing program portal login (no platform hostnames in UI). */
export const portalLoginUrl = `${normalizeBase(
  process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://app.voltasport.co",
)}/login`;

/** Server/catalog API origin (defaults to live portal API when env is unset). */
export const portalApiOrigin = normalizeBase(
  process.env.PORTAL_ORIGIN ??
    process.env.NEXT_PUBLIC_PORTAL_URL ??
    "https://voltasport.vercel.app",
);
