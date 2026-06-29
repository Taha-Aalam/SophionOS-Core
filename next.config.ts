import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const isProd = process.env.NODE_ENV === "production";

// Supabase endpoint the browser client connects to (REST + realtime websocket).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).origin : "";
  } catch {
    return "";
  }
})();
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");

// Content-Security-Policy.
//
// NOTE: 'unsafe-inline' is required in style-src because the UI relies on
// inline styles (Tailwind/base-ui runtime styles, next-themes). script-src
// keeps 'unsafe-inline' because this app is statically rendered — moving to a
// strict nonce-based CSP would force every page to dynamic rendering (see
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// 'unsafe-eval' is dev-only (React refresh / Turbopack).
// Clerk FAPI host — derived from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
// pk_test_<base64(frontendApiURL)$> → <frontendApiURL>.
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkFapiHost = (() => {
  try {
    const raw = clerkPublishableKey.replace(/^pk_(test|live)_/, "");
    const decoded = Buffer.from(raw, "base64").toString("utf8").replace(/\$$/, "");
    return decoded ? new URL(`https://${decoded}`).origin : "";
  } catch {
    return "";
  }
})();

// Allowlist Clerk hosts for CSP. `clerk.accounts.dev` is the dev FAPI suffix;
// `clerk-telemetry.com` is the analytics beacon; `img.clerk.com` hosts avatars.
// Turnstile hosts — Clerk's bot protection embeds Cloudflare Turnstile.
// `challenges.cloudflare.com` hosts the widget iframe; `*.turnstile.cloudflare.com`
// and `*.cloudflare.com` cover its scripts, beacons, and analytics.
const clerkCspHosts = [
  "https://clerk.accounts.dev",
  "https://*.clerk.accounts.dev",
  "https://clerk-telemetry.com",
  "https://img.clerk.com",
  clerkFapiHost,
].filter(Boolean);

const turnstileHosts = [
  "https://challenges.cloudflare.com",
  "https://*.turnstile.cloudflare.com",
  "https://*.cloudflare.com",
];

const cspHostList = [...clerkCspHosts, ...turnstileHosts]
  .filter(Boolean)
  .join(" ");

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    isProd ? "" : " 'unsafe-eval'"
  } ${cspHostList}`.trim(),
  // Clerk uses `new Worker(URL.createObjectURL(...))` for its session-polling
  // shim. Without an explicit `worker-src` the browser falls back to
  // `script-src`, which does not include `blob:` and silently blocks the
  // worker — breaking Clerk's session refresh in CSP-strict modes.
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https: ${cspHostList}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} ${cspHostList}`.trim(),
  `frame-src 'self' ${cspHostList}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project so Next does not warn about an
  // inferred workspace root (the build is always invoked from the repo root).
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["@base-ui/react", "@base-ui/utils"],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      ...(isProd
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
    ];
  },
  experimental: {
    optimizePackageImports: [
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-placeholder",
      "@hello-pangea/dnd",
      "cmdk",
    ],
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
