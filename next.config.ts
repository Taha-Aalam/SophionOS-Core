import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const isProd = process.env.NODE_ENV === "production";

// The Content-Security-Policy is emitted per request by src/proxy.ts
// (nonce-based script-src); everything static lives here.
const securityHeaders = [
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
  // Allow local.sophionos.com through dev-server origin checks (hosts-file
  // mapping for Clerk prod-keys-locally debugging; see Clerk docs).
  // localhost/127.0.0.1 are included so the server also accepts direct
  // hits on the loopback names (the unified mkcert in certificates/dev.pem
  // covers all three — see below).
  allowedDevOrigins: ["local.sophionos.com", "localhost", "127.0.0.1"],
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
