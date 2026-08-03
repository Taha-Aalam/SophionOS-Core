import { describe, expect, it } from "vitest";

import { isConfiguredAppHost, normalizeOrigin } from "@/lib/routing/host";

describe("isConfiguredAppHost (env-driven app host detection)", () => {
  it("matches the hostname of NEXT_PUBLIC_APP_URL exactly", () => {
    // Dev and prod are just two different env values — no subdomain prefix.
    expect(isConfiguredAppHost("dev.sophionos.com", "https://dev.sophionos.com")).toBe(true);
    expect(isConfiguredAppHost("app.sophionos.com", "https://app.sophionos.com")).toBe(true);
    expect(isConfiguredAppHost("app.localhost:3000", "http://app.localhost:3000")).toBe(true);
  });

  it("matches an apex deployment (no app. prefix required)", () => {
    expect(isConfiguredAppHost("life-os-core.vercel.app", "https://life-os-core.vercel.app")).toBe(true);
    expect(isConfiguredAppHost("life-os-core.vercel.app", "https://life-os-core.vercel.app/dashboard")).toBe(true);
  });

  it("ignores port on the incoming host when comparing", () => {
    expect(isConfiguredAppHost("example.com:443", "https://example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isConfiguredAppHost("LIFE-OS-CORE.VERCEL.APP", "https://life-os-core.vercel.app")).toBe(true);
  });

  it("does NOT match by subdomain prefix — only the configured host is the app", () => {
    // An `app.` host is NOT the app unless NEXT_PUBLIC_APP_URL points at it.
    expect(isConfiguredAppHost("app.sophionos.com", "https://dev.sophionos.com")).toBe(false);
    expect(isConfiguredAppHost("app.example.com", "https://example.com")).toBe(false);
    expect(isConfiguredAppHost("other.vercel.app", "https://life-os-core.vercel.app")).toBe(false);
    expect(isConfiguredAppHost("app.life-os-core.vercel.app", "https://life-os-core.vercel.app")).toBe(false);
  });

  it("returns false when env is unset (no host is the app)", () => {
    expect(isConfiguredAppHost("app.sophionos.com", null)).toBe(false);
    expect(isConfiguredAppHost("app.sophionos.com", undefined)).toBe(false);
    expect(isConfiguredAppHost("app.sophionos.com", "")).toBe(false);
  });

  it("returns false for missing host or unparseable url", () => {
    expect(isConfiguredAppHost(null, "https://dev.sophionos.com")).toBe(false);
    expect(isConfiguredAppHost(null, null)).toBe(false);
    expect(isConfiguredAppHost("dev.sophionos.com", "not a url")).toBe(false);
  });
});

describe("normalizeOrigin", () => {
  it("strips trailing path/slash down to the origin", () => {
    expect(normalizeOrigin("http://app.localhost:3000")).toBe(
      "http://app.localhost:3000",
    );
    expect(normalizeOrigin("http://app.localhost:3000/")).toBe(
      "http://app.localhost:3000",
    );
    expect(normalizeOrigin("https://app.example.com/dashboard")).toBe(
      "https://app.example.com",
    );
  });

  it("returns null for unset or unparseable values", () => {
    expect(normalizeOrigin(null)).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin("not a url")).toBeNull();
  });
});
