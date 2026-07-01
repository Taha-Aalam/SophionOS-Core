import { describe, it, expect, vi, beforeEach } from "vitest";

// getTier/isPaidTier resolve the caller tier via the admin client's
// subscriptions read (same as the rate limiter). Mock it to control the
// returned row per test.
const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: () => mockMaybeSingle(),
  }),
}));

import { getTier, isPaidTier, requirePaidTier, clearTierCache } from "@/lib/api/subscription";
import { AppError } from "@/lib/api/error-handler";

let n = 0;
function uniqueId(): string {
  return `user_sub_${Date.now()}_${n++}`;
}

describe("subscription tier resolution", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    clearTierCache();
  });

  it("defaults a caller with no subscription row to free", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getTier(uniqueId())).toBe("free");
  });

  it("returns pro for an active pro row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "pro", status: "active" }, error: null });
    expect(await getTier(uniqueId())).toBe("pro");
  });

  it("returns lifetime for an active lifetime row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "lifetime", status: "active" }, error: null });
    expect(await getTier(uniqueId())).toBe("lifetime");
  });

  it("returns max for an active max row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "max", status: "active" }, error: null });
    expect(await getTier(uniqueId())).toBe("max");
  });

  it("falls back to free for a non-active row (e.g. canceled)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "pro", status: "canceled" }, error: null });
    expect(await getTier(uniqueId())).toBe("free");
  });

  it("falls back to free for an unrecognized tier value", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "premium", status: "active" }, error: null });
    expect(await getTier(uniqueId())).toBe("free");
  });

  it("fails closed to free on a lookup error", async () => {
    mockMaybeSingle.mockRejectedValue(new Error("db down"));
    expect(await getTier(uniqueId())).toBe("free");
  });

  it("isPaidTier is false for free, true for pro/lifetime/max", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await isPaidTier(uniqueId())).toBe(false);

    mockMaybeSingle.mockResolvedValue({ data: { tier: "pro", status: "active" }, error: null });
    expect(await isPaidTier(uniqueId())).toBe(true);

    mockMaybeSingle.mockResolvedValue({ data: { tier: "lifetime", status: "active" }, error: null });
    expect(await isPaidTier(uniqueId())).toBe(true);

    mockMaybeSingle.mockResolvedValue({ data: { tier: "max", status: "active" }, error: null });
    expect(await isPaidTier(uniqueId())).toBe(true);
  });

  it("caches the resolved tier per user (second call skips the read)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "pro", status: "active" }, error: null });
    const id = uniqueId();
    expect(await getTier(id)).toBe("pro");
    expect(await getTier(id)).toBe("pro");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("requirePaidTier throws 403 TIER_REQUIRED for a free caller", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requirePaidTier(uniqueId())).rejects.toMatchObject({
      statusCode: 403,
      code: "TIER_REQUIRED",
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requirePaidTier(uniqueId())).rejects.toBeInstanceOf(AppError);
  });

  it("requirePaidTier resolves (no throw) for pro/lifetime/max callers", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { tier: "pro", status: "active" }, error: null });
    await expect(requirePaidTier(uniqueId())).resolves.toBeUndefined();

    mockMaybeSingle.mockResolvedValue({ data: { tier: "lifetime", status: "active" }, error: null });
    await expect(requirePaidTier(uniqueId())).resolves.toBeUndefined();

    mockMaybeSingle.mockResolvedValue({ data: { tier: "max", status: "active" }, error: null });
    await expect(requirePaidTier(uniqueId())).resolves.toBeUndefined();
  });

  it("requirePaidTier 403 publicMessage is the upgrade prompt (4xx exposes message)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    try {
      await requirePaidTier(uniqueId());
      throw new Error("expected requirePaidTier to throw");
    } catch (e) {
      expect((e as AppError).publicMessage).toBe("This feature requires a Pro subscription.");
    }
  });
});
