import { describe, expect, it, vi } from "vitest";
import { runBriefDispatch, type BriefDispatchDeps } from "@/lib/notifications/dispatch";
import type { TodayData } from "@/lib/services/dashboard.service";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F6
 * (src/lib/notifications/dispatch.ts:runBriefDispatch-sendBudget-counts-nonSendable-candidates, low).
 *
 * runBriefDispatch incremented sendAttempts BEFORE resolving the recipient:
 * both non-sendable outcomes (no resolvable Clerk email — terminal skip;
 * Clerk lookup throw — non-terminal 'failed' retried every hourly tick)
 * consumed the shared MAX_SENDS_PER_RUN budget, and the unordered candidate
 * stream let persistent burners starve sendable tenants with a silent
 * 200/sent=0. A send attempt must only count when a send is imminent, and
 * candidate enumeration must be deterministic.
 */

const today = {
  greeting: "Hi",
  tasksTodayCount: 0,
  todayTasks: [],
  activeGoals: [],
  stats: { overdueCount: 0, completedThisWeek: 0, activeGoalsCount: 0 },
  recentActivity: [],
} as unknown as TodayData;

const prefs = {
  morning_briefing_enabled: true,
  morning_briefing_hour: 0,
  evening_review_enabled: false,
  evening_review_hour: null,
  weekly_digest_day: null,
  email_enabled: true,
};

const BURNERS = 50;
const HEALTHY = 10;

function makeDeps(resolveEmailImpl: (userId: string) => Promise<string | null>) {
  const sendEmailCalls: string[] = [];
  const candidates = [
    ...Array.from({ length: BURNERS }, (_, i) => ({ userId: `burner-${i + 1}`, prefs, timezone: "UTC" })),
    ...Array.from({ length: HEALTHY }, (_, i) => ({ userId: `healthy-${i + 1}`, prefs, timezone: "UTC" })),
  ];
  const deps = {
    listNotificationCandidates: async () => candidates,
    hasTerminalDelivery: async () => false,
    loadToday: async () => today,
    resolveEmail: resolveEmailImpl,
    sendEmail: vi.fn(async ({ to }: { to: string }) => {
      sendEmailCalls.push(to);
      return { id: "re_1" };
    }),
    recordDelivery: vi.fn(async () => {}),
    appUrl: "https://app.example.test",
    now: new Date("2026-07-23T09:05:00.000Z"),
    sendEmailCalls,
  } as unknown as BriefDispatchDeps & { sendEmailCalls: string[] };
  return deps;
}

describe("brief dispatch send-budget accounting (audit F6)", () => {
  it("50 no-email candidates do NOT starve the 10 sendable ones", async () => {
    const deps = makeDeps(async (userId) =>
      userId.startsWith("burner-") ? null : `h-${userId}@example.com`,
    );
    const result = await runBriefDispatch(deps);
    expect(result.candidates).toBe(60);
    expect(result.sent).toBe(HEALTHY);
    expect(deps.sendEmailCalls).toHaveLength(HEALTHY);
    expect(deps.sendEmailCalls.every((to) => to.startsWith("h-healthy-"))).toBe(true);
    expect(result.skipped).toBe(BURNERS);
  });

  it("50 throwing email lookups do NOT consume the send budget", async () => {
    const deps = makeDeps(async (userId) => {
      if (userId.startsWith("burner-")) throw new Error("clerk_user_not_found");
      return `h-${userId}@example.com`;
    });
    const result = await runBriefDispatch(deps);
    expect(result.sent).toBe(HEALTHY);
    expect(result.failed).toBe(BURNERS);
    expect(deps.sendEmailCalls).toHaveLength(HEALTHY);
  });

  it("send attempts stay capped for real sends (the bound still applies)", async () => {
    const deps = makeDeps(async () => "h-everyone@example.com");
    const result = await runBriefDispatch(deps);
    expect(result.sent).toBeLessThanOrEqual(50);
    expect(deps.sendEmailCalls.length).toBe(result.sent);
  });
});
