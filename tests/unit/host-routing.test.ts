import { describe, expect, it } from "vitest";

import { isAppHost, isConfiguredAppHost, normalizeOrigin } from "@/lib/routing/host";

describe("host classification (apex vs app subdomain)", () => {
  it("treats the app. subdomain as the application host", () => {
    expect(isAppHost("app.localhost:3000")).toBe(true);
    expect(isAppHost("app.localhost")).toBe(true);
    expect(isAppHost("app.example.com")).toBe(true);
    // Case and port are ignored.
    expect(isAppHost("APP.LOCALHOST:3000")).toBe(true);
  });

  it("treats the apex host as marketing (not the app)", () => {
    expect(isAppHost("localhost:3000")).toBe(false);
    expect(isAppHost("example.com")).toBe(false);
    expect(isAppHost("www.example.com")).toBe(false);
  });

  it("does not misclassify app-lookalike hosts", () => {
    // Requires the dot after `app`; `apps.` / `application.` are not the app.
    expect(isAppHost("apps.example.com")).toBe(false);
    expect(isAppHost("application.example.com")).toBe(false);
  });

  it("returns false for missing hosts", () => {
    expect(isAppHost(null)).toBe(false);
    expect(isAppHost(undefined)).toBe(false);
    expect(isAppHost("")).toBe(false);
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

describe("isConfiguredAppHost", () => {
  it("matches when host equals the NEXT_PUBLIC_APP_URL hostname", () => {
    expect(isConfiguredAppHost("life-os-core.vercel.app", "https://life-os-core.vercel.app")).toBe(true);
    expect(isConfiguredAppHost("life-os-core.vercel.app", "https://life-os-core.vercel.app/dashboard")).toBe(true);
  });

  it("ignores port on the incoming host when comparing", () => {
    expect(isConfiguredAppHost("example.com:443", "https://example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isConfiguredAppHost("LIFE-OS-CORE.VERCEL.APP", "https://life-os-core.vercel.app")).toBe(true);
  });

  it("returns false when host does not match configured URL", () => {
    expect(isConfiguredAppHost("other.vercel.app", "https://life-os-core.vercel.app")).toBe(false);
    expect(isConfiguredAppHost("app.life-os-core.vercel.app", "https://life-os-core.vercel.app")).toBe(false);
  });

  it("returns false for missing inputs", () => {
    expect(isConfiguredAppHost(null, "https://life-os-core.vercel.app")).toBe(false);
    expect(isConfiguredAppHost("life-os-core.vercel.app", null)).toBe(false);
    expect(isConfiguredAppHost(null, null)).toBe(false);
    expect(isConfiguredAppHost("life-os-core.vercel.app", "not a url")).toBe(false);
  });
});
