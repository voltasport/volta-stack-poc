import {NextRequest, NextResponse} from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/api/auth",
  "/api/catalog",
  "/api/checkout",
];

export function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;
  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");
  if (sessionCookie?.value) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
