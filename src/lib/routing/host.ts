// Host classification for the apex/subdomain split.
//
// The marketing site and the application are served by the SAME Next.js
// deployment, differentiated only by the request Host header:
//   - apex      (e.g. localhost:3000 / example.com)      → marketing only
//   - subdomain (e.g. app.localhost:3000 / app.example.com) → the application
//
// These helpers are pure so they can be unit-tested without a request object.

/**
 * True when the host belongs to the application subdomain (an `app.` prefix).
 * Port and case are ignored. Returns false for the apex host and for
 * look-alikes such as `apps.example.com` (the dot after `app` is required).
 */
export function isAppHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname.startsWith("app.");
}

/**
 * True when the host exactly matches the hostname from the configured
 * NEXT_PUBLIC_APP_URL. Handles deployments where the app is served at the apex
 * host (e.g. life-os-core.vercel.app) rather than an `app.` subdomain.
 */
export function isConfiguredAppHost(
  host: string | null | undefined,
  appUrl: string | null | undefined,
): boolean {
  if (!host || !appUrl) return false;
  try {
    const configuredHostname = new URL(appUrl).hostname.toLowerCase();
    const hostname = host.split(":")[0]?.toLowerCase() ?? "";
    return hostname === configuredHostname;
  } catch {
    return false;
  }
}

/**
 * Normalize a configured public origin (NEXT_PUBLIC_APP_URL) to its origin
 * form with no trailing slash. Returns null when unset or unparseable so the
 * caller can fall back to deriving the origin from the incoming request.
 */
export function normalizeOrigin(appUrl: string | null | undefined): string | null {
  if (!appUrl) return null;
  try {
    return new URL(appUrl).origin;
  } catch {
    return null;
  }
}
