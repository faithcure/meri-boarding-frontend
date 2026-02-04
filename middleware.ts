import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["de", "en", "tr"];
const defaultLocale = "de";

function isPublicFile(pathname: string) {
  return pathname.includes(".") || pathname.startsWith("/_next");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || isPublicFile(pathname)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (locales.includes(maybeLocale)) {
    const locale = maybeLocale;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set("LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  const cookieLocale = request.cookies.get("LOCALE")?.value;
  const locale = locales.includes(cookieLocale || "") ? cookieLocale! : defaultLocale;
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
