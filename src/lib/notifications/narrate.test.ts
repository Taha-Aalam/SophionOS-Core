import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TodayData } from "@/lib/services/dashboard.service";

vi.mock("@/lib/services/user-settings.service", () => ({
  userSettingsService: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/ai/gateway", () => ({
  generateCompletion: vi.fn(),
}));

import { generateCompletion } from "@/lib/ai/gateway";
import { userSettingsService } from "@/lib/services/user-settings.service";
import { narrateBrief, NARRATION_DEADLINE_MARGIN_MS } from "./narrate";

const mockGetPrefs = vi.mocked(userSettingsService.get);
const mockGenerate = vi.mocked(generateCompletion);

const today: TodayData = {
  greeting: "Hi",
  tasksTodayCount: 3,
  todayTasks: [
    {
      id: "t1",
      title: "Pay Q4 VAT",
      description: null,
      dueDate: null,
      priority: "high",
      status: "pending",
      isOverdue: true,
      projectId: null,
      projectName: null,
      areaId: null,
      areaName: null,
    },
  ],
  activeGoals: [],
  stats: { completedThisWeek: 4, activeGoalsCount: 2, overdueCount: 1 },
  recentActivity: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPrefs.mockResolvedValue({
    ai_narration_enabled: true,
    ai_narration_provider: "openrouter",
    ai_narration_model: "deepseek/deepseek-chat-v3-0324:free",
  });
  mockGenerate.mockResolvedValue({
    text: "Good morning — one payment is overdue.",
    provider: "openrouter",
    model: "deepseek/deepseek-chat-v3-0324:free",
    usage: { inputTokens: 100, outputTokens: 20 },
  });
});

const input = {
  userId: "user_1",
  kind: "morning_briefing" as const,
  today,
  localDate: "2026-07-23",
};

describe("narrateBrief", () => {
  it("returns the narration outcome on the happy path", async () => {
    const outcome = await narrateBrief(input, { supabase: {} as never });
    expect(outcome).toEqual({
      text: "Good morning — one payment is overdue.",
      provider: "openrouter",
      model: "deepseek/deepseek-chat-v3-0324:free",
    });
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        purpose: "brief_narration",
        provider: "openrouter",
        model: "deepseek/deepseek-chat-v3-0324:free",
        maxTokens: 700,
        timeoutMs: 12_000,
      }),
      expect.anything(),
    );
  });

  it("returns null when narration is disabled (gateway never called)", async () => {
    mockGetPrefs.mockResolvedValueOnce({ ai_narration_enabled: false });
    const outcome = await narrateBrief(input, { supabase: {} as never });
    expect(outcome).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns null when there is no prefs row", async () => {
    mockGetPrefs.mockResolvedValueOnce(null);
    const outcome = await narrateBrief(input, { supabase: {} as never });
    expect(outcome).toBeNull();
  });

  it("returns null when the prefs row is malformed", async () => {
    mockGetPrefs.mockResolvedValueOnce("garbage" as never);
    const outcome = await narrateBrief(input, { supabase: {} as never });
    expect(outcome).toBeNull();
  });

  it("returns null when the run deadline is inside the safety margin", async () => {
    const outcome = await narrateBrief(
      { ...input, deadlineAt: Date.now() + NARRATION_DEADLINE_MARGIN_MS - 1 },
      { supabase: {} as never },
    );
    expect(outcome).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("narrates while the deadline still leaves the safety margin", async () => {
    const outcome = await narrateBrief(
      { ...input, deadlineAt: Date.now() + NARRATION_DEADLINE_MARGIN_MS + 5_000 },
      { supabase: {} as never },
    );
    expect(outcome).not.toBeNull();
  });

  it("maps every gateway failure to null (deterministic fallback)", async () => {
    mockGenerate.mockRejectedValueOnce(
      new Error("ProviderAuthError: bad key"),
    );
    expect(
      await narrateBrief(input, { supabase: {} as never }),
    ).toBeNull();

    mockGenerate.mockRejectedValueOnce(new Error("NoCredentialError"));
    expect(
      await narrateBrief(input, { supabase: {} as never }),
    ).toBeNull();
  });
});
