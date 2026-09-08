// Pure host-relocation decision for src/proxy.ts, extracted so the entire
// branch matrix is unit-testable without a request object (tests/unit/
// proxy-decision.test.ts pins it to live pre-migration captures of the old
// proxy on the app host, apex host, and single-host mode).
//
// Auth is NO LONGER decided here. Pre-migration this logic included
// `auth.protect()` for non-public paths on the app host; the resource-based
// migration moved that responsibility to the surfaces that own the data:
//   - (dashboard)/layout.tsx  -> redirectToSignIn() for anonymous sessions
//   - onboarding/layout.tsx   -> same
//   - /api/v1/*               -> already self-authenticate (requireAuth /
//     CRON_SECRET / webhook HMAC), unchanged by the proxy's session gate
//   - marketing + auth pages  -> intentionally public (forgot/reset-password
//     and the trust pages were un-gated deliberately in this change)
//
// What remains here is Clerk-independent routing the proxy has always owned:
// the apex(marketing) <-> app-origin split driven by NEXT_PUBLIC_APP_URL.

import { isConfiguredAppHost, normalizeOrigin } from "./host";
import { createPathMatcher, normalizeRequestPath } from "./path-matcher";

// Paths that must render in place on the apex host instead of being relocated
// to the app origin: marketing landing, Clerk internals, and the billing
// webhook (unauthenticated but signature-verified in-route; may be configured
// against either domain). '/api/billing/(.*)' below matches no existing route
// — carried verbatim from the pre-migration matcher lists.
const isApexPassthrough = createPathMatcher([
  "/",
  "/__clerk(.*)",
  "/api/v1/billing/webhook(.*)",
]);

const isSelfAuthApi = createPathMatcher([
  "/api/v1/(.*)",
  "/api/billing/(.*)",
  // pg_cron -> pg_net POST; authenticates via CRON_SECRET in-route.
  "/api/cron/(.*)",
]);

export interface ProxyDecisionInput {
  /** Raw Host header value (may include :port). */
  host: string | null | undefined;
  /** Raw request pathname (pre-normalization). */
  pathname: string;
  /** Raw search string including '?', or ''. */
  search: string;
  /** NEXT_PUBLIC_APP_URL (null/undefined => single-host mode). */
  appUrl: string | null | undefined;
}

export type ProxyDecision =
  | { kind: "next" }
  | { kind: "redirect"; to: string };

export function resolveProxyDecision(input: ProxyDecisionInput): ProxyDecision {
  const { host, pathname, search, appUrl } = input;

  // Parity with the old proxy: every branch (except the impossible literal
  // '/') passed the raw pathname to at least one Clerk matcher, each of which
  // normalized internally — so malformed percent-encoding threw
  // MalformedURLError (400 via clerkMiddleware's control-flow handler) on
  // every request, every host. Run the same normalization for its throw
  // side effect; all matching below still uses the RAW pathname, exactly like
  // the pre-migration `matcher(request)` calls.
  normalizeRequestPath(pathname);

  // App host: serve in place; the bare root is the dashboard shortcut.
  // (Root check on the raw pathname, as `request.nextUrl.pathname === '/'` was.)
  if (isConfiguredAppHost(host, appUrl)) {
    if (pathname === "/") {
      return { kind: "redirect", to: "/dashboard" };
    }
    return { kind: "next" };
  }

  // Apex host: marketing and passthroughs render in place...
  if (isApexPassthrough(pathname)) {
    return { kind: "next" };
  }

  const appOrigin = normalizeOrigin(appUrl);

  // ...API relocates to the app origin when configured, else serves in place
  // (single-host mode).
  if (isSelfAuthApi(pathname)) {
    if (appOrigin) {
      return relocate(appOrigin, pathname, search);
    }
    return { kind: "next" };
  }

  // Non-API app paths relocate to the app origin. Without one configured
  // (single-host mode) everything serves in place; anonymous users are
  // bounced by the resource-based gates listed in the header comment.
  if (appOrigin) {
    return relocate(appOrigin, pathname, search);
  }
  return { kind: "next" };
}

function relocate(appOrigin: string, pathname: string, search: string): ProxyDecision {
  // Quirk pin: Location is built from the RAW pathname (matching only used the
  // normalized form), exactly as the pre-migration proxy did. A protocol-
  // relative '//' pathname therefore escapes the app origin.
  return { kind: "redirect", to: new URL(`${pathname}${search}`, appOrigin).toString() };
}
