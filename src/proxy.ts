import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isConfiguredAppHost, normalizeOrigin } from "@/lib/routing/host";

// Public routes that never require a session. Everything else is protected
// (deny-by-default), mirroring the prior auth-routing behavior.
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
]);

// Paths that must pass through on the apex host without being relocated to the
// app origin: marketing landing, Clerk internals, and webhooks that must hit the
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

// Origin the application is served from, taken solely from NEXT_PUBLIC_APP_URL
// (no subdomain-prefix fallback). When unset the deployment runs in single-host
// mode and app routes are served in place on the current host.
function resolveAppOrigin(): string | null {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

export const proxy = clerkMiddleware(async (auth, request) => {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;

  if (isConfiguredAppHost(host, process.env.NEXT_PUBLIC_APP_URL)) {
    // App host (matches NEXT_PUBLIC_APP_URL's hostname). Send the bare root to
    // the dashboard and protect everything that is not an explicitly public
    // route. /api/v1 self-authenticates (Clerk session OR API key) — do not
    // force interactive login for Bearer API-key / MCP clients.
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

  // Apex host: marketing only. Let the marketing landing and framework/Clerk
  // internals render in place; relocate any application route to the app origin.
  // API on apex: redirect to app origin so inventory stays on one host, except
  // billing webhooks which may be configured against the apex domain.
  if (isApexPassthrough(request)) {
    return NextResponse.next();
  }

  if (isSelfAuthApi(request)) {
    const appOrigin = resolveAppOrigin();
    if (appOrigin) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, appOrigin));
    }
    return NextResponse.next();
  }

  const appOrigin = resolveAppOrigin();
  if (appOrigin) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, appOrigin));
  }

  // No app origin is configured (NEXT_PUBLIC_APP_URL unset): single-host mode.
  // Serve app routes in place on the current host, still auth-protected so the
  // deny-by-default contract holds without a redirect target. Public routes
  // (e.g. /login) render without a session.
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  runtime: "edge",
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
