import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAppHost, normalizeOrigin } from "@/lib/routing/host";

// Public routes that never require a session. Everything else is protected
// (deny-by-default), mirroring the prior auth-routing behavior.
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
]);

// Paths that must pass through on the apex host without being relocated to the
// subdomain: the marketing landing itself plus framework/Clerk internals.
const isApexPassthrough = createRouteMatcher([
  "/",
  "/__clerk(.*)",
  "/(api|trpc)(.*)",
]);

// Origin of the application subdomain (e.g. http://app.localhost:3000). Derived
// from NEXT_PUBLIC_APP_URL so the host/port is never hardcoded. When unset we
// fall back to prefixing the incoming apex host with `app.`.
function resolveAppOrigin(requestHost: string | null): string | null {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;
  if (!requestHost) return null;
  return `http://app.${requestHost}`;
}

export const proxy = clerkMiddleware(async (auth, request) => {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;

  if (isAppHost(host)) {
    // Subdomain: this is the application. Send the bare root to the dashboard
    // and protect everything that is not an explicitly public route.
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return NextResponse.next();
  }

  // Apex host: marketing only. It must never enter auth.protect()/login. Let
  // the marketing landing and framework/Clerk internals render in place;
  // relocate any application route to the subdomain origin.
  if (isApexPassthrough(request)) {
    return NextResponse.next();
  }

  const appOrigin = resolveAppOrigin(host);
  if (appOrigin) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, appOrigin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
