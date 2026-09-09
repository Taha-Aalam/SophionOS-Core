import { describe, expect, it } from "vitest";

import { resolveProxyDecision } from "@/lib/routing/proxy-decision";

// Characterization suite for the proxy's host-relocation logic. Every case is
// pinned to live captures of the pre-migration proxy on this branch's base
// commit (app host local.sophionos.com, apex host landing.sophionos.com, and
// single-host mode with NEXT_PUBLIC_APP_URL unset). `next` = serve in place;
// `redirect` = 307 Location target.

const APP_URL = "https://local.sophionos.com";
const APP_HOST = "local.sophionos.com:443";
const APEX_HOST = "landing.sophionos.com";

function decide(pathname: string, opts?: { host?: string; search?: string; appUrl?: string | null }) {
  return resolveProxyDecision({
    host: opts?.host ?? APP_HOST,
    pathname,
    search: opts?.search ?? "",
    appUrl: opts?.appUrl === undefined ? APP_URL : opts.appUrl,
  });
}

describe("app host", () => {
  it("relocates the bare root to /dashboard", () => {
    expect(decide("/")).toEqual({ kind: "redirect", to: "/dashboard" });
  });

  it("serves everything else in place — auth is owned by layouts/routes now", () => {
    // Pre-migration these passed (200 or route-level 401/405); post-migration
    // the proxy verdict is identical. The anon 307-to-login for /dashboard now
    // comes from (dashboard)/layout's redirectToSignIn(), verified separately
    // against the live server after cutover.
    for (const p of [
      "/dashboard", "/settings/profile", "/login", "/signup",
      "/forgot-password", "/reset-password", // approved quirk fix: public
      "/privacy", "/security", "/subprocessors", "/responsible-disclosure",
      "/data-and-ai",
      "/api/v1/tasks", "/api/v1", "/api/cron/briefs", "/api/v1/billing/webhook",
    ]) {
      expect(decide(p), p).toEqual({ kind: "next" });
    }
  });
});

describe("apex host (marketing only)", () => {
  it("renders the marketing root in place", () => {
    expect(decide("/", { host: APEX_HOST })).toEqual({ kind: "next" });
  });

  it("lets Clerk internals and the billing webhook render in place", () => {
    expect(decide("/__clerk", { host: APEX_HOST })).toEqual({ kind: "next" });
    expect(decide("/__clerk/current_session", { host: APEX_HOST })).toEqual({ kind: "next" });
    expect(decide("/api/v1/billing/webhook", { host: APEX_HOST })).toEqual({ kind: "next" });
    expect(decide("/api/v1/billing/webhook/", { host: APEX_HOST })).toEqual({ kind: "next" });
  });

  it("relocates every other path to the app origin, preserving query", () => {
    expect(decide("/dashboard", { host: APEX_HOST })).toEqual({
      kind: "redirect",
      to: `${APP_URL}/dashboard`,
    });
    expect(decide("/api/cron/briefs", { host: APEX_HOST })).toEqual({
      kind: "redirect",
      to: `${APP_URL}/api/cron/briefs`,
    });
    expect(decide("/privacy", { host: APEX_HOST, search: "?a=1&b=2" })).toEqual({
      kind: "redirect",
      to: `${APP_URL}/privacy?a=1&b=2`,
    });
  });

  it("quirk pin: protocol-relative pathname escapes the app origin (URL semantics)", () => {
    // The pre-migration proxy computed `new URL(pathname + search, appOrigin)`.
    // For a '//host'-style pathname that is protocol-relative, so the Location
    // becomes 'https://privacy/' — pinned here so the refactor is provably
    // behavior-identical (fixing it is a separate, deliberate change).
    expect(decide("//privacy", { host: APEX_HOST })).toEqual({
      kind: "redirect",
      to: "https://privacy/",
    });
  });
});

describe("single-host mode (NEXT_PUBLIC_APP_URL unset)", () => {
  const unset = { appUrl: null as string | null };

  it("every host is apex; everything not passthrough relocates nowhere and serves in place", () => {
    // Pre-migration: apex branch with null appOrigin → isSelfAuthApi next;
    // everything else fell through to protect(). With resource-based auth the
    // layouts gate themselves, so the proxy serves in place across the board.
    expect(decide("/", unset)).toEqual({ kind: "next" });
    expect(decide("/dashboard", unset)).toEqual({ kind: "next" });
    expect(decide("/api/v1/tasks", unset)).toEqual({ kind: "next" });
    expect(decide("/login", unset)).toEqual({ kind: "next" });
    expect(decide("/privacy", unset)).toEqual({ kind: "next" });
  });
});

describe("malformed percent-encoding contract", () => {
  it("throws MalformedURLError (clerkMiddleware converts to 400 — golden: /login%zz, /api/v1/%zz)", () => {
    expect(() => decide("/login%zz")).toThrow(/Malformed encoding/);
    expect(() => decide("/api/v1/%zz")).toThrow(/Malformed encoding/);
    expect(() => decide("/login%zz", { host: APEX_HOST })).toThrow(/Malformed encoding/);
    try {
      decide("/login%zz");
    } catch (e) {
      expect((e as Error).name).toBe("MalformedURLError");
    }
  });
});
