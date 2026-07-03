import { beforeEach, describe, expect, it, vi } from "vitest";

import { userSettingsService } from "../../src/lib/services/user-settings.service";

// A tiny fake Supabase client that records the last key-value written per
// (user_id, key) and can echo a preset value back on read. The real service
// only uses `.from().select().eq().eq().single()` for reads and
// `.from().upsert()` for writes, so we mirror that shape.
function makeSupabase(store: Record<string, unknown> = {}) {
  let selectedKey: string | null = null;

  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(function (this: unknown, column: string, value: string) {
      if (column === "key") selectedKey = value;
      return client;
    }),
    single: vi.fn(async () => {
      if (selectedKey !== null && selectedKey in store) {
        return { data: { value: store[selectedKey] }, error: null };
      }
      return { data: null, error: { code: "PGRST116", message: "no rows" } };
    }),
    upsert: vi.fn(async (row: { key: string; value: unknown }) => {
      store[row.key] = row.value;
      return { error: null };
    }),
  };

  return { client, store };
}

describe("userSettingsService typed keys", () => {
  const userId = "user_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads a default onboarding state when nothing is stored", async () => {
    const { client } = makeSupabase();

    const value = await userSettingsService.getOnboardingState(userId, {
      supabase: client as never,
    });

    expect(value).toMatchObject({ completed: false, current_step: "areas" });
  });

  it("round-trips onboarding state through user_settings", async () => {
    const { client } = makeSupabase();

    await userSettingsService.setOnboardingState(
      userId,
      { completed: false, current_step: "project", draft: { goal_id: "g1" } },
      { supabase: client as never },
    );

    const value = await userSettingsService.getOnboardingState(userId, {
      supabase: client as never,
    });

    expect(value).toMatchObject({ completed: false, current_step: "project" });
    expect(value.draft).toMatchObject({ goal_id: "g1" });
  });

  it("writes preferences and notifications as separate K/V records", async () => {
    const { client, store } = makeSupabase();

    await userSettingsService.setPreferences(
      userId,
      { timezone: "Asia/Calcutta" },
      { supabase: client as never },
    );
    await userSettingsService.setNotifications(
      userId,
      { morning_briefing_enabled: true },
      { supabase: client as never },
    );

    expect(store).toHaveProperty("preferences");
    expect(store).toHaveProperty("notifications");
    expect(store).not.toHaveProperty("note_defaults");
  });

  it("persists timezone preferences separately from note defaults", async () => {
    const { client } = makeSupabase();

    await userSettingsService.setPreferences(
      userId,
      { timezone: "UTC" },
      { supabase: client as never },
    );
    const value = await userSettingsService.getPreferences(userId, {
      supabase: client as never,
    });

    expect(value?.timezone).toBe("UTC");
  });

  it("returns null notifications when none are stored", async () => {
    const { client } = makeSupabase();

    const value = await userSettingsService.getNotifications(userId, {
      supabase: client as never,
    });

    expect(value).toBeNull();
  });
});
