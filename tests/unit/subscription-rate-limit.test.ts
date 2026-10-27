import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression test for audit rider
// `src/app/api/v1/user/subscription/route.ts:GET:unthrottled-db-and-clerk-fanout`:
// GET /user/subscription was the only /user data route with no rate limit,
// while its handler fans out to tier lookups, one count query per entity
// table, cohort membership and an uncached Clerk backend call. Every sibling
// /user route calls rateLimit(request, userId) immediately after auth — the
// limiter must be invoked ahead of any service call here too.

const { rateLimit, callOrder } = vi.hoisted(() => {
  const callOrder: string[] = [];
  return {
    callOrder,
    rateLimit: vi.fn(async () => {
      callOrder.push("rateLimit");
      return { success: true };
    }),
  };
});

vi.mock("@/lib/api/api-auth", () => ({
  requireAuth: vi.fn(async () => {
    callOrder.push("requireAuth");
    return { userId: "user-1", type: "clerk" };
  }),
}));

vi.mock("@/lib/api/rate-limiter", () => ({ rateLimit }));

vi.mock("@/lib/api/subscription", () => ({
  getTier: vi.fn(async () => {
    callOrder.push("getTier");
    return "pro";
  }),
  isPaidTier: vi.fn(async () => {
    callOrder.push("isPaidTier");
    return true;
  }),
  getEntityCount: vi.fn(async () => {
    callOrder.push("getEntityCount");
    return 0;
  }),
  getEntityCountsPerType: vi.fn(async () => {
    callOrder.push("getEntityCountsPerType");
    return {};
  }),
  ENTITY_LIMITS: { pro: 500, free: 100 },
}));

vi.mock("@/lib/api/cohort-membership", () => ({
  isCohortMember: vi.fn(async () => {
    callOrder.push("isCohortMember");
    return false;
  }),
}));

vi.mock("@/lib/notifications/resolve-email", () => ({
  resolveUserEmail: vi.fn(async () => {
    callOrder.push("resolveUserEmail");
    return "user-1@example.test";
  }),
}));

import { GET as subscriptionGet } from "@/app/api/v1/user/subscription/route";

beforeEach(() => {
  callOrder.length = 0;
  rateLimit.mockClear();
});

describe("GET /user/subscription is rate limited before the fan-out", () => {
  it("invokes the limiter ahead of any tier/entity/cohort/Clerk call", async () => {
    const res = await subscriptionGet(
      new NextRequest("http://localhost:3000/api/v1/user/subscription", {
        method: "GET",
      }),
    );
    expect(res.status).toBe(200);
    expect(rateLimit).toHaveBeenCalledTimes(1);
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET" }),
      "user-1",
    );
    expect(callOrder[0]).toBe("requireAuth");
    expect(callOrder[1]).toBe("rateLimit");
    expect(callOrder.indexOf("getTier")).toBeGreaterThan(1);
  });
});
