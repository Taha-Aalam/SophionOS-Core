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
