/**
 * Content-Security-Policy construction (plan Task 10, report recommendation 9).
 *
 * script-src is nonce-based: the proxy (src/proxy.ts) generates a per-request
 * nonce and emits the policy, so any future raw-HTML sink is backstopped by
 * the browser instead of relying solely on the editor schema. With a nonce in
 * place, 'unsafe-inline' is gone from script-src and 'strict-dynamic' lets
 * Next's nonce'd bootstrap load its chunks (JS-inserted scripts inherit
 * trust; the host allowlist only matters for browsers without CSP3 support).
 *
 * NOTE: a nonce forces every page that passes through the proxy to dynamic
 * rendering — the accepted tradeoff for script-src hardening. style-src keeps
 * 'unsafe-inline' because the UI relies on inline styles (Tailwind/base-ui
 * runtime styles, next-themes).
 */

// Clerk FAPI host — derived from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
// pk_test_<base64(frontendApiURL)$> → <frontendApiURL>.
export function clerkFapiOriginFromPublishableKey(
  publishableKey: string | undefined,
): string {
  const raw = (publishableKey ?? "").replace(/^pk_(test|live)_/, "");
  if (!raw) return "";
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8").replace(/\$$/, "");
    return decoded ? new URL(`https://${decoded}`).origin : "";
  } catch {
    return "";
  }
}

// Allowlist Clerk hosts for CSP. `clerk.accounts.dev` is the dev FAPI suffix;
// `clerk-telemetry.com` is the analytics beacon; `img.clerk.com` hosts avatars.
// Turnstile hosts — Clerk's bot protection embeds Cloudflare Turnstile.
// `challenges.cloudflare.com` hosts the widget iframe; `*.turnstile.cloudflare.com`
// and `*.cloudflare.com` cover its scripts, beacons, and analytics.
const STATIC_CSP_HOSTS = [
  "https://clerk.accounts.dev",
  "https://*.clerk.accounts.dev",
  "https://clerk-telemetry.com",
  "https://img.clerk.com",
  "https://challenges.cloudflare.com",
  "https://*.turnstile.cloudflare.com",
  "https://*.cloudflare.com",
];

export function buildCspHeader(input: {
  nonce: string;
  isProd: boolean;
  supabaseUrl: string | undefined;
  clerkPublishableKey: string | undefined;
}): string {
  const supabaseOrigin = (() => {
    try {
      return input.supabaseUrl ? new URL(input.supabaseUrl).origin : "";
    } catch {
      return "";
    }
  })();
  const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");
  const clerkFapiHost = clerkFapiOriginFromPublishableKey(input.clerkPublishableKey);

  const cspHostList = [...STATIC_CSP_HOSTS, clerkFapiHost].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    // Per-request nonce + strict-dynamic: no 'unsafe-inline' in script-src.
    `script-src 'self' 'nonce-${input.nonce}' 'strict-dynamic'${
      input.isProd ? "" : " 'unsafe-eval'"
    } ${cspHostList}`.trim(),
    // Clerk uses `new Worker(URL.createObjectURL(...))` for its session-polling
    // shim. Without an explicit `worker-src` the browser falls back to
    // `script-src`, which does not include `blob:` and silently blocks the
    // worker — breaking Clerk's session refresh in CSP-strict modes.
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    // Prefer self/blob/data + known hosts over unrestricted https: for user content images.
    `img-src 'self' blob: data: ${supabaseOrigin} ${cspHostList} https://*.googleusercontent.com https://lh3.googleusercontent.com`.trim(),
    "font-src 'self'",
    // Browser API calls: same-origin + Supabase + Clerk/Turnstile hosts.
    `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} ${cspHostList}`.trim(),
    `frame-src 'self' ${cspHostList}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(input.isProd ? ["upgrade-insecure-requests"] : []),
  ]
    .filter(Boolean)
    .join("; ");
}
