import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveProxyDecision } from "@/lib/routing/proxy-decision";

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
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
