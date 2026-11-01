import { beforeEach, describe, expect, it, vi } from "vitest";

import { seedDefaultAreas } from "../../src/lib/services/onboarding.service";
import { userSettingsService } from "../../src/lib/services/user-settings.service";

function makeRpcClient(error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });
  return { client: { rpc } as never, rpc };
}

describe("seedDefaultAreas (seed_default_areas RPC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the exactly-once seed RPC with the slugged DEFAULT_AREAS payload", async () => {
    const { client, rpc } = makeRpcClient();

    await seedDefaultAreas({ supabase: client });

    expect(rpc).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpc.mock.calls[0];
    expect(fnName).toBe("seed_default_areas");
    // Owner is derived from the JWT inside the RPC — the payload carries no
    // user_id (the old per-login upsert embedded one).
    expect(args.p_areas).toHaveLength(9);
    expect(args.p_areas.map((a: { slug: string }) => a.slug)).toEqual([
      "work",
      "health",
      "finances",
      "personal-growth",
      "family-friends",
      "home",
      "travel",
      "career",
      "inception-vault",
    ]);
    for (const area of args.p_areas) {
      expect(Object.keys(area).sort()).toEqual(
        ["color", "description", "icon", "name", "slug", "type"].sort(),
      );
    }
  });

  it("propagates RPC failures", async () => {
    const { client } = makeRpcClient({ message: "seed_default_areas: no authenticated user" });

    await expect(seedDefaultAreas({ supabase: client })).rejects.toThrow(
      "Failed to seed default areas: seed_default_areas: no authenticated user",
    );
  });
});

describe("userSettingsService.getOnboardingRow (seed marker anchor read)", () => {
  const userId = "user_123";

  function makeClient(singleData: unknown, errorCode?: string) {
    const eq = vi.fn().mockReturnThis();
    const client = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq,
      single: vi.fn().mockResolvedValue({
        data: singleData,
        error: errorCode ? { code: errorCode, message: "no rows" } : null,
      }),
    };
    return { client, eq };
  }

  it("returns the onboarding state and the seed marker from one read", async () => {
    const { client, eq } = makeClient({
      value: { completed: true, current_step: "inbox" },
      areas_seeded_at: "2026-11-01T00:00:00+00:00",
    });

    const row = await userSettingsService.getOnboardingRow(userId, {
      supabase: client as never,
    });

    expect(row).toEqual({
      state: { completed: true, current_step: "inbox" },
      areasSeededAt: "2026-11-01T00:00:00+00:00",
    });
    expect(eq).toHaveBeenCalledWith("user_id", userId);
    expect(eq).toHaveBeenCalledWith("key", "onboarding");
  });

  it("maps a missing anchor row to state+marker NULL (never initialized)", async () => {
    const { client } = makeClient(null, "PGRST116");

    const row = await userSettingsService.getOnboardingRow(userId, {
      supabase: client as never,
    });

    expect(row).toEqual({ state: null, areasSeededAt: null });
  });

  it("keeps getOnboardingState's missing-row default behavior", async () => {
    const { client } = makeClient(null, "PGRST116");

    const state = await userSettingsService.getOnboardingState(userId, {
      supabase: client as never,
    });

    expect(state).toMatchObject({ completed: false, current_step: "areas" });
  });
});
