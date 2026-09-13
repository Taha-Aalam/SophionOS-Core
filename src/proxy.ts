import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveProxyDecision } from "@/lib/routing/proxy-decision";
import { buildCspHeader } from "@/lib/security/csp";

// Resource-based auth (Clerk's replacement for the deprecated
// createRouteMatcher + auth.protect() pattern): this proxy no longer decides
// who may load a page. Session enforcement lives with the resources —
//   (dashboard)/layout and onboarding/layout call auth() and
//   redirectToSignIn() for anonymous users,
//   /api/v1/* self-authenticate (Clerk session OR Bearer API key via
//   requireAuth), /api/cron/* checks CRON_SECRET, the billing webhook
//   verifies HMAC — all unchanged, as the proxy already let every /api/v1
//   request through on the app host.
//
// What remains is the Clerk-independent job this proxy owns: the apex
// (marketing) <-> app-origin split configured via NEXT_PUBLIC_APP_URL.
// The full branch matrix (with malformed-encoding 400s and redirect
// construction) is extracted into resolveProxyDecision and pinned by
// tests/unit/proxy-decision.test.ts against live pre-migration captures.
//
// Plus the nonce-based CSP (plan Task 10): a per-request nonce is generated
// here, emitted on the request (so Next stamps its scripts with it) and on
// the response as the Content-Security-Policy. Passing through the proxy
// makes every page dynamic — the accepted tradeoff for removing
// 'unsafe-inline' from script-src (see src/lib/security/csp.ts).
export const proxy = clerkMiddleware((_auth, request) => {
  const decision = resolveProxyDecision({
    host: request.headers.get("host"),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (decision.kind === "redirect") {
    const target = decision.to.startsWith("/")
      ? new URL(decision.to, request.url)
      : new URL(decision.to);
    return NextResponse.redirect(target);
  }

  const nonce = crypto.randomUUID();
  const csp = buildCspHeader({
    nonce,
    isProd: process.env.NODE_ENV === "production",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the nonce for its own inline scripts from this request header.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
