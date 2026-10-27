import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression tests for audit rider
// `…applyEntitlement:partial-tier-cache-invalidation-on-entitlement-change`:
// the billing webhook invalidated only the subscription module's tier cache;
// the rate limiter keeps a second, independent 60 s per-user tier cache and
// its invalidateTierCache export had no importer at all — so a downgraded
// user kept the old (higher) limit for up to 60 s. The fix introduces one
// invalidateEntitlementCaches seam (subscription.ts) that clears BOTH caches
// and is what the webhook calls.

// Controlled subscriptions row for the real admin client consumers.
const { adminState } = vi.hoisted(() => ({
  adminState: { tier: "pro" as string },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    function builder(table?: string) {
      const api: Record<string, unknown> = {};
      api.select = () => api;
      api.eq = () => api;
      api.upsert = () => Promise.resolve({ error: null });
      api.maybeSingle = () =>
        Promise.resolve({
          data:
            table === "subscriptions"
              ? { tier: adminState.tier, status: "active" }
              : null,
          error: null,
        });
      api.single = () => Promise.resolve({ data: null, error: null });
      api.then = (
        resolve: (v: { data: unknown; error: null }) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve({ data: null, error: null }).then(resolve, reject);
      return api;
    }
    return { from: (t: string) => builder(t) };
  }),
}));

// Spy wrappers that call through to the real implementations, so the real
// seam is exercised end to end.
vi.mock("@/lib/api/rate-limiter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/rate-limiter")>();
  return {
    ...actual,
    invalidateTierCache: vi.fn(
      (userId: string) => actual.invalidateTierCache(userId),
    ),
  };
});

vi.mock("@/lib/api/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/subscription")>();
  return {
    ...actual,
    invalidateTierCache: vi.fn(
      (userId: string) => actual.invalidateTierCache(userId),
    ),
  };
});

import { rateLimit } from "@/lib/api/rate-limiter";
import {
  invalidateEntitlementCaches,
  invalidateTierCache as subInvalidateTierCache,
} from "@/lib/api/subscription";
import { invalidateTierCache as rlInvalidateTierCache } from "@/lib/api/rate-limiter";
import { POST as billingWebhookPost } from "@/app/api/v1/billing/webhook/route";

const SECRET = "test-webhook-secret";

function webhookRequest(event: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/billing/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${SECRET}`,
    },
    body: JSON.stringify(event),
  });
}

beforeEach(() => {
  adminState.tier = "pro";
  process.env.BILLING_WEBHOOK_SECRET = SECRET;
  vi.mocked(subInvalidateTierCache).mockClear();
  vi.mocked(rlInvalidateTierCache).mockClear();
});

describe("the entitlement invalidation seam clears both tier caches", () => {
  it("the effective rate limit drops immediately after invalidation", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/areas", {
      method: "GET",
    });

    const before = await rateLimit(request, "user-cache-1");
    expect(before.limit).toBe(500); // pro, now cached

    adminState.tier = "free"; // the downgrade lands in the DB

    // Without invalidation the stale pro tier survives the cache TTL.
    const stale = await rateLimit(request, "user-cache-1");
    expect(stale.limit).toBe(500);

    invalidateEntitlementCaches("user-cache-1");

    const after = await rateLimit(request, "user-cache-1");
    expect(after.limit).toBe(100); // downgraded value, immediately
  });
});

describe("the billing webhook invalidates both caches via the seam", () => {
  it("applies the downgraded rate limit immediately after the webhook", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/areas", {
      method: "GET",
    });

    // Pro tier becomes cached in the rate limiter.
    const before = await rateLimit(request, "user-hook-2");
    expect(before.limit).toBe(500);

    // The downgrade lands (webhook applies it via the admin client)…
    adminState.tier = "free";
    const res = await billingWebhookPost(
      webhookRequest({
        id: "evt-2",
        type: "subscription.updated",
        user_id: "user-hook-2",
        tier: "free",
        status: "active",
      }),
    );
    expect(res.status).toBe(200);

    // …and the effective limit is the downgraded value IMMEDIATELY, not
    // after the rate limiter's 60 s tier-cache TTL (false on base).
    const after = await rateLimit(request, "user-hook-2");
    expect(after.limit).toBe(100);
  });
});
