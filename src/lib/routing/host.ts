// Host classification for the apex/app split.
//
// The marketing site and the application are served by the SAME Next.js
// deployment, differentiated only by the request Host header. Which host is the
// application is decided SOLELY by NEXT_PUBLIC_APP_URL — there is no hardcoded
// subdomain prefix. Set NEXT_PUBLIC_APP_URL to the exact origin you want the app
// served from, e.g.:
//   - Dev:  https://dev.sophionos.com
//   - Prod: https://app.sophionos.com
// Any other host is treated as the apex/marketing host and app routes are
// redirected to the configured app origin.
//
// These helpers are pure so they can be unit-tested without a request object.

/**
 * True when the host exactly matches the hostname from the configured
 * NEXT_PUBLIC_APP_URL. This is the single source of truth for "is this the app
 * host" — there is no subdomain-prefix fallback. Port and case are ignored.
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
 * caller can fall back to single-host mode (serve the app on the current host).
 */
export function normalizeOrigin(appUrl: string | null | undefined): string | null {
  if (!appUrl) return null;
  try {
    return new URL(appUrl).origin;
  } catch {
    return null;
  }
}
