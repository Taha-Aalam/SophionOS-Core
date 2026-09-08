import { describe, expect, it } from "vitest";

import { createPathMatcher } from "@/lib/routing/path-matcher";

// Characterization suite: every assertion is pinned to the truth table captured
// from the live @clerk/shared createPathMatcher (the engine behind Clerk's
// deprecated createRouteMatcher). Golden baseline: .scratch/golden/.

describe("createPathMatcher — '/' pattern", () => {
  it("matches only the exact root, nothing deeper", () => {
    const m = createPathMatcher(["/"]);
    expect(m("/")).toBe(true);
    expect(m("/dashboard")).toBe(false);
    expect(m("/dashboard/")).toBe(false);
    expect(m("/login")).toBe(false);
  });
});

describe("createPathMatcher — '(.*)' prefix capture", () => {
  it("matches the bare prefix, trailing slash, sub-paths, AND glued suffixes", () => {
    const m = createPathMatcher(["/login(.*)", "/signup(.*)"]);
    // Golden: /login=1 /login/=1 /login/x=1 /loginfoo=1 (prefix quirk preserved)
    expect(m("/login")).toBe(true);
    expect(m("/login/")).toBe(true);
    expect(m("/login/x")).toBe(true);
    expect(m("/loginfoo")).toBe(true);
    expect(m("/logi")).toBe(false);
    expect(m("/signup/[[...rest]]")).toBe(true);
  });

  it("'x/(.*)' requires the slash — bare /api/v1 does not match (golden: 0)", () => {
    const m = createPathMatcher(["/api/v1/(.*)"]);
    expect(m("/api/v1")).toBe(false);
    expect(m("/api/v1/")).toBe(true);
    expect(m("/api/v1/tasks")).toBe(true);
    expect(m("/api/v1/billing/webhook")).toBe(true);
  });
});

describe("createPathMatcher — path normalization", () => {
  it("collapses consecutive slashes before matching (anti-bypass)", () => {
    const m = createPathMatcher(["/api/v1/(.*)"]);
    // Golden: //api//v1//tasks=1
    expect(m("//api//v1//tasks")).toBe(true);
    const root = createPathMatcher(["/"]);
    // Golden: /dashboard//=0 ... and '//' collapses to '/' which matches '/'
    expect(root("//")).toBe(true);
    expect(root("/dashboard//")).toBe(false);
  });

  it("decodes percent-UNRESERVED chars only; reserved delimiters stay encoded", () => {
    const m = createPathMatcher(["/api/v1/(.*)", "/login(.*)"]);
    // Golden: /%2Flogin=0 /%2fapi%2fv1%2ftasks=0 (%2F survives decodeURI)
    expect(m("/%2Flogin")).toBe(false);
    expect(m("/%2fapi%2fv1%2ftasks")).toBe(false);
    // unreserved chars decode: %2D- is '-', so /%2Ddashboard !== /dashboard still.
    // But /%2login style unreserved decode: e.g. /lo%67in -> /login
    expect(m("/lo%67in")).toBe(true);
  });
});
// ---------------------------------------------------------------------------
// Full golden sweep: every row captured from the live @clerk/shared engine
// against the exact three pattern groups src/proxy.ts used. 1:1 parity is the
// no-functionality-breaks contract; this table IS the spec.
// ---------------------------------------------------------------------------

const GOLDEN_GROUPS = {
  isPublicRoute: ["/", "/login(.*)", "/signup(.*)"],
  isApexPassthrough: ["/", "/__clerk(.*)", "/api/v1/billing/webhook(.*)"],
  isSelfAuthApi: ["/api/v1/(.*)", "/api/billing/(.*)", "/api/cron/(.*)"],
} as const;

type Gold = 0 | 1 | "THROW";
const GOLDEN: Record<keyof typeof GOLDEN_GROUPS, Record<string, Gold>> = {
  isPublicRoute: {
    "/": 1, "/login": 1, "/login/": 1, "/login/x": 1, "/loginfoo": 1, "/logi": 0,
    "/signup": 1, "/signup/[[...rest]]": 1, "/dashboard": 0, "/dashboard/": 0,
    "/privacy": 0, "/security": 0, "/subprocessors": 0, "/responsible-disclosure": 0,
    "/data-and-ai": 0, "/forgot-password": 0, "/reset-password": 0,
    "/settings/profile": 0, "/onboarding": 0, "/__clerk": 0,
    "/__clerk/current_session": 0, "/api": 0, "/api/": 0, "/api/v1": 0,
    "/api/v1/": 0, "/api/v1/tasks": 0, "/api/v1/billing/webhook": 0,
    "/api/v1/billing/webhook/": 0, "/api/v1/mcp/health": 0, "/api/billing": 0,
    "/api/billing/stripe": 0, "/api/cron": 0, "/api/cron/": 0,
    "/api/cron/briefs": 0, "//api//v1//tasks": 0, "/%2Flogin": 0,
    "/%2fapi%2fv1%2ftasks": 0, "/login%zz": "THROW", "/dashboard//": 0,
    "/api/v1/../privacy": 0,
  },
  isApexPassthrough: {
    "/": 1, "/login": 0, "/login/": 0, "/login/x": 0, "/loginfoo": 0, "/logi": 0,
    "/signup": 0, "/signup/[[...rest]]": 0, "/dashboard": 0, "/dashboard/": 0,
    "/privacy": 0, "/security": 0, "/subprocessors": 0, "/responsible-disclosure": 0,
    "/data-and-ai": 0, "/forgot-password": 0, "/reset-password": 0,
    "/settings/profile": 0, "/onboarding": 0, "/__clerk": 1,
    "/__clerk/current_session": 1, "/api": 0, "/api/": 0, "/api/v1": 0,
    "/api/v1/": 0, "/api/v1/tasks": 0, "/api/v1/billing/webhook": 1,
    "/api/v1/billing/webhook/": 1, "/api/v1/mcp/health": 0, "/api/billing": 0,
    "/api/billing/stripe": 0, "/api/cron": 0, "/api/cron/": 0,
    "/api/cron/briefs": 0, "//api//v1//tasks": 0, "/%2Flogin": 0,
    "/%2fapi%2fv1%2ftasks": 0, "/login%zz": "THROW", "/dashboard//": 0,
    "/api/v1/../privacy": 0,
  },
  isSelfAuthApi: {
    "/": 0, "/login": 0, "/login/": 0, "/login/x": 0, "/loginfoo": 0, "/logi": 0,
    "/signup": 0, "/signup/[[...rest]]": 0, "/dashboard": 0, "/dashboard/": 0,
    "/privacy": 0, "/security": 0, "/subprocessors": 0, "/responsible-disclosure": 0,
    "/data-and-ai": 0, "/forgot-password": 0, "/reset-password": 0,
    "/settings/profile": 0, "/onboarding": 0, "/__clerk": 0,
    "/__clerk/current_session": 0, "/api": 0, "/api/": 0, "/api/v1": 0,
    "/api/v1/": 1, "/api/v1/tasks": 1, "/api/v1/billing/webhook": 1,
    "/api/v1/billing/webhook/": 1, "/api/v1/mcp/health": 1, "/api/billing": 0,
    "/api/billing/stripe": 1, "/api/cron": 0, "/api/cron/": 1,
    "/api/cron/briefs": 1, "//api//v1//tasks": 1, "/%2Flogin": 0,
    "/%2fapi%2fv1%2ftasks": 0, "/login%zz": "THROW", "/dashboard//": 0,
    "/api/v1/../privacy": 1,
  },
};

describe("createPathMatcher — golden sweep vs live @clerk/shared table", () => {
  for (const [group, table] of Object.entries(GOLDEN)) {
    const patterns = GOLDEN_GROUPS[group as keyof typeof GOLDEN_GROUPS];
    const match = createPathMatcher([...patterns]);
    for (const [pathname, gold] of Object.entries(table)) {
      const label = gold === "THROW" ? "throws MalformedURLError" : `=> ${gold === 1}`;
      it(`${group}: ${pathname} ${label}`, () => {
        if (gold === "THROW") {
          expect(() => match(pathname)).toThrow(/Malformed encoding/);
          try {
            match(pathname);
          } catch (e) {
            // name-based contract consumed by clerkMiddleware's handler
            expect((e as Error).name).toBe("MalformedURLError");
          }
        } else {
          expect(match(pathname)).toBe(gold === 1);
        }
      });
    }
  }
});