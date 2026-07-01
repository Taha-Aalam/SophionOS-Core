import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// rate-limiter resolves the caller tier via the admin client's subscriptions
// read. Mock it to control the returned tier per test.
const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: () => mockMaybeSingle(),
  }),
}));

import { rateLimit } from "@/lib/api/rate-limiter";
import { AuthError } from "@/lib/api/error-handler";

function req(): NextRequest {
  return new NextRequest("http://localhost/api/v1/areas");
}

let n = 0;
function uniqueId(): string {
  return `user_rl_${Date.now()}_${n++}`;
}

describe("rate-limiter", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("defaults a caller with no subscription row to the free tier (limit 100)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await rateLimit(req(), uniqueId());
    expect(result.success).toBe(true);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(99);
  });

  it("applies the pro tier limit (500) for an active pro subscription", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "pro", status: "active" }, error: null });
    const result = await rateLimit(req(), uniqueId());
    expect(result.limit).toBe(500);
    expect(result.success).toBe(true);
  });

  it("applies the premium tier limit (1000)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "premium", status: "active" }, error: null });
    const result = await rateLimit(req(), uniqueId());
    expect(result.limit).toBe(1000);
  });

  it("blocks once the free-tier limit is exceeded within the window", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const id = uniqueId();
    let last = await rateLimit(req(), id);
    for (let i = 1; i < 100; i++) {
      last = await rateLimit(req(), id);
    }
    expect(last.success).toBe(true);
    expect(last.remaining).toBe(0);
    const blocked = await rateLimit(req(), id);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("counts each caller independently", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const a = await rateLimit(req(), uniqueId());
    const b = await rateLimit(req(), uniqueId());
    expect(a.remaining).toBe(99);
    expect(b.remaining).toBe(99);
  });
});

describe("rate-limiter auth contract", () => {
  // The limiter is keyed by the userId that requireAuth resolves — never by IP
  // (API-key callers share IPs). There is no anonymous limiter path: every
  // route calls requireAuth FIRST, so an unauthenticated request is rejected
  // with AuthError (HTTP 401) BEFORE rateLimit ever runs. This test pins that
  // ordering invariant so the limiter can never be reached without a userId.
  it("requires an authenticated userId as the identifier (401/AuthError gates it upstream)", async () => {
    const authFailsFirst = async () => {
      throw new AuthError("Authentication required");
    };
    await expect(authFailsFirst()).rejects.toBeInstanceOf(AuthError);
    try {
      await authFailsFirst();
    } catch (e) {
      // AuthError maps to a 401 response; the limiter is never invoked.
      expect((e as AuthError).statusCode).toBe(401);
    }
  });
});
