import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAppHost, isConfiguredAppHost, normalizeOrigin } from "@/lib/routing/host";

// Public routes that never require a session. Everything else is protected
// (deny-by-default), mirroring the prior auth-routing behavior.
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
]);

// Paths that must pass through on the apex host without being relocated to the
// subdomain: marketing landing, Clerk internals, and webhooks that must hit the
// deployment origin regardless of host.
const isApexPassthrough = createRouteMatcher([
  "/",
  "/__clerk(.*)",
  // Billing webhooks are unauthenticated but signature-verified in-route.
  "/api/v1/billing/webhook(.*)",
]);

// API routes that intentionally skip Clerk session middleware (they self-auth
// via Bearer API key or webhook signature). Still matched so they are not
// redirected off the apex when mis-routed.
const isSelfAuthApi = createRouteMatcher([
  "/api/v1/(.*)",
  "/api/billing/(.*)",
  // pg_cron → pg_net POST; authenticates via CRON_SECRET in-route.
  "/api/cron/(.*)",
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

  if (isAppHost(host) || isConfiguredAppHost(host, process.env.NEXT_PUBLIC_APP_URL)) {
    // Subdomain: this is the application. Send the bare root to the dashboard
    // and protect everything that is not an explicitly public route.
    // /api/v1 self-authenticates (Clerk session OR API key) — do not force
    // interactive login for Bearer API-key / MCP clients.
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isSelfAuthApi(request)) {
      return NextResponse.next();
    }
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return NextResponse.next();
  }

  // Apex host: marketing only. It must never enter auth.protect()/login. Let
  // the marketing landing and framework/Clerk internals render in place;
  // relocate any application route to the subdomain origin.
  // API on apex: redirect to app origin so inventory stays on one host, except
  // billing webhooks which may be configured against the apex domain.
  if (isApexPassthrough(request)) {
    return NextResponse.next();
  }

  if (isSelfAuthApi(request)) {
    const appOrigin = resolveAppOrigin(host);
    if (appOrigin) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, appOrigin));
    }
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
