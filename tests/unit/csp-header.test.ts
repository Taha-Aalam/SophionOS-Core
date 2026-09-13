import { describe, expect, it } from "vitest";

import { buildCspHeader, clerkFapiOriginFromPublishableKey } from "@/lib/security/csp";

const nonce = "abc123==+nonce/xyz";

describe("buildCspHeader", () => {
  it("puts the per-request nonce in script-src and never uses unsafe-inline there", () => {
    const csp = buildCspHeader({
      nonce,
      isProd: true,
      supabaseUrl: "https://example.supabase.co",
      clerkPublishableKey: undefined,
    });
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("keeps unsafe-eval dev-only and upgrade-insecure-requests prod-only", () => {
    const dev = buildCspHeader({ nonce, isProd: false, supabaseUrl: "", clerkPublishableKey: undefined });
    const prod = buildCspHeader({ nonce, isProd: true, supabaseUrl: "", clerkPublishableKey: undefined });
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("keeps the Clerk worker blob: allowance and inline styles, and scopes connect-src", () => {
    const csp = buildCspHeader({
      nonce,
      isProd: true,
      supabaseUrl: "https://example.supabase.co",
      clerkPublishableKey: undefined,
    });
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self' https://example.supabase.co wss://example.supabase.co");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("derives the Clerk FAPI origin from the publishable key when present", () => {
    // pk_test_<base64(frontendApiURL)$>
    const key = `pk_test_${Buffer.from("clerk.example.com$").toString("base64")}`;
    const csp = buildCspHeader({
      nonce,
      isProd: true,
      supabaseUrl: "",
      clerkPublishableKey: key,
    });
    expect(clerkFapiOriginFromPublishableKey(key)).toBe("https://clerk.example.com");
    expect(csp).toContain("https://clerk.example.com");
  });

  it("tolerates malformed supabase URLs and keys without throwing", () => {
    expect(() =>
      buildCspHeader({ nonce, isProd: true, supabaseUrl: "not-a-url", clerkPublishableKey: "pk_test_@@@" }),
    ).not.toThrow();
  });
});
