import { describe, expect, it, vi } from "vitest";
import {
  runBriefDispatch,
  type BriefDispatchDeps,
} from "./dispatch";
import type { TodayData } from "@/lib/services/dashboard.service";
import type { NotificationPrefs } from "./types";

const sampleToday: TodayData = {
  greeting: "Hi",
  tasksTodayCount: 1,
  todayTasks: [
    {
      id: "t1",
      title: "Ship plan",
      description: null,
      dueDate: null,
      priority: "medium",
      status: "pending",
      isOverdue: false,
      projectId: null,
      projectName: null,
      areaId: null,
      areaName: null,
    },
  ],
  activeGoals: [],
  stats: { completedThisWeek: 0, activeGoalsCount: 0, overdueCount: 0 },
  recentActivity: [],
};

const prefs: NotificationPrefs = {
  morning_briefing_enabled: true,
  morning_briefing_time: "08:00",
  evening_review_enabled: false,
  evening_review_time: null,
  weekly_digest_day: null,
  email_enabled: true,
};

// 2026-07-23 08:05 UTC — morning window in UTC
const nowInWindow = new Date("2026-07-23T08:05:00.000Z");

function makeDeps(
  overrides: Partial<BriefDispatchDeps> = {},
): BriefDispatchDeps {
  return {
    listNotificationCandidates: vi.fn(async () => [
      { userId: "user_1", prefs, timezone: "UTC" },
    ]),
    hasTerminalDelivery: vi.fn(async () => false),
    loadToday: vi.fn(async () => sampleToday),
    resolveEmail: vi.fn(async () => "user@example.com"),
    sendEmail: vi.fn(async () => ({ id: "re_123" })),
    recordDelivery: vi.fn(async () => {}),
    appUrl: "https://app.example.com",
    windowMinutes: 15,
    now: nowInWindow,
    ...overrides,
  };
}

describe("runBriefDispatch", () => {
  it("sends once and records sent when due and no prior delivery", async () => {
    const deps = makeDeps();
    const result = await runBriefDispatch(deps);

    expect(result.candidates).toBe(1);
    expect(result.due).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    expect(deps.recordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        kind: "morning_briefing",
        localDate: "2026-07-23",
        status: "sent",
      }),
    );
    const sendArg = vi.mocked(deps.sendEmail).mock.calls[0]?.[0];
    expect(sendArg?.mail.text).toContain("Ship plan");
  });

  it("skips send when terminal delivery already exists", async () => {
    const deps = makeDeps({
      hasTerminalDelivery: vi.fn(async () => true),
    });
    const result = await runBriefDispatch(deps);

    expect(result.due).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.recordDelivery).not.toHaveBeenCalled();
  });

  it("records skipped when no recipient email", async () => {
    const deps = makeDeps({
      resolveEmail: vi.fn(async () => null),
    });
    const result = await runBriefDispatch(deps);

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.recordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "no_email",
      }),
    );
  });

  it("records failed when send throws", async () => {
    const deps = makeDeps({
      sendEmail: vi.fn(async () => {
        throw new Error("resend_down");
      }),
    });
    const result = await runBriefDispatch(deps);

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(deps.recordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error: "resend_down",
      }),
    );
  });
});
