import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: () => mockMaybeSingle(),
  }),
}));

import { getTier, clearTierCache } from "@/lib/api/subscription";

describe("repro: tier-cache downgrade window (60s stale pro)", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    clearTierCache();
    vi.useRealTimers();
  });

  it("returns stale pro after DB downgrade within TTL — the vulnerability", async () => {
    const userId = `user_repro_${Date.now()}`;

    // First call: DB says active pro -> cached as pro
    mockMaybeSingle.mockResolvedValueOnce({ data: { tier: "pro", status: "active" }, error: null });
    const first = await getTier(userId);
    expect(first).toBe("pro");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);

    // DB is now downgraded to free/canceled (webhook not called, or admin direct write)
    // Second call with injected supabase that would return free — but cache wins
    mockMaybeSingle.mockResolvedValueOnce({ data: { tier: "pro", status: "canceled" }, error: null });
    // Also test via injected client path: getTier with options.supabase that returns free
    // but the in-memory tierCache still returns pro without hitting DB at all.
    const mockSupabaseFree = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { tier: "free", status: "active" }, error: null }),
          }),
        }),
      }),
    } as any;

    const second = await getTier(userId, { supabase: mockSupabaseFree });
    // BUG: still pro despite DB now being free — cache TTL is 60s
    console.log(`[repro] first=${first} second=${second} expected=free (downgraded)`);
    if (second === "pro") {
      console.log("[repro] CONFIRMED: stale pro returned within TTL window");
    }
    expect(second).toBe("pro"); // proves stale cache — fix should make this "free"
    // DB mock was NOT called again because cache short-circuited
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("after TTL expiry it would read downgraded tier", async () => {
    const userId = `user_repro_ttl_${Date.now()}`;
    vi.useFakeTimers();
    mockMaybeSingle.mockResolvedValueOnce({ data: { tier: "pro", status: "active" }, error: null });
    expect(await getTier(userId)).toBe("pro");
    // Advance past 60s TTL
    vi.advanceTimersByTime(61_000);
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // now free
    const after = await getTier(userId);
    expect(after).toBe("free");
    vi.useRealTimers();
  });

  it("clearTierCache invalidation restores correct tier immediately", async () => {
    const userId = `user_repro_invalidate_${Date.now()}`;
    mockMaybeSingle.mockResolvedValueOnce({ data: { tier: "pro", status: "active" }, error: null });
    expect(await getTier(userId)).toBe("pro");
    // Simulate webhook/admin calling clearTierCache
    clearTierCache();
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await getTier(userId)).toBe("free");
  });
});
