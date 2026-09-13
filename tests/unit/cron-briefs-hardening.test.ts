/**
 * Cron hardening tests (plan Task 11, report recommendation 10):
 *  1. the cron secret comparison is timing-safe and rejects wrong secrets,
 *  2. one failing candidate does not abort the dispatch loop — the run
 *     completes, the response reports per-candidate outcomes,
 *  3. delivery-record failures are best-effort and never mask the outcome.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const due = {
  kind: "morning_briefing" as const,
  localDate: "2026-09-13",
  configuredTime: "08:00",
};

vi.mock("@/lib/notifications/schedule", () => ({
  kindsDueForUser: vi.fn(() => [due]),
}));

const sentEmails: string[] = [];
const failDedupeFor = new Set<string>();
const failSendFor = new Set<string>();
const failResolveFor = new Set<string>();

vi.mock("@/lib/notifications/dispatch", () => ({
  runBriefDispatch: vi.fn(),
  createDefaultBriefDispatchDeps: vi.fn(() => ({})),
}));

// The real dispatch loop for isolation tests (the module mock above only
// exists so the route handler can be driven without a database).
const realDispatch = (await vi.importActual<typeof import("@/lib/notifications/dispatch")>(
  "@/lib/notifications/dispatch",
));
const realRunBriefDispatch = realDispatch.runBriefDispatch;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

import { POST } from "@/app/api/cron/briefs/route";
import { runBriefDispatch } from "@/lib/notifications/dispatch";
import type { BriefDispatchDeps } from "@/lib/notifications/dispatch";

const SECRET = "cron-secret-abc123";

function cronRequest(auth?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (auth !== undefined) {
    if (auth === "x-cron") headers["x-cron-secret"] = SECRET;
    else headers.authorization = auth;
  }
  return new NextRequest("http://localhost/api/cron/briefs", {
    method: "POST",
    headers,
  });
}

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
  failDedupeFor.clear();
  failSendFor.clear();
  failResolveFor.clear();
  sentEmails.length = 0;
});

describe("cron briefs authorization", () => {
  it("rejects a wrong bearer secret with 401", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await POST(cronRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("rejects a missing secret and an unset CRON_SECRET env", async () => {
    const res = await POST(cronRequest());
    expect(res.status).toBe(401);
    const res2 = await POST(cronRequest(`Bearer ${SECRET}`));
    expect(res2.status).toBe(401);
  });

  it("accepts the correct secret via bearer and x-cron-secret (timing-safe path)", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await POST(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const res2 = await POST(cronRequest("x-cron"));
    expect(res2.status).toBe(200);
  });
});

describe("brief dispatch per-candidate isolation", () => {
  function baseDeps(): BriefDispatchDeps {
    const users = ["user-1", "user-2", "user-3"];
    return {
      listNotificationCandidates: async () =>
        users.map((userId) => ({ userId, prefs: {}, timezone: "UTC" })),
      hasTerminalDelivery: async (a) => {
        if (failDedupeFor.has(a.userId)) throw new Error("db hiccup");
        return false;
      },
      loadToday: async () =>
        ({
          greeting: "Hi",
          tasksTodayCount: 0,
          todayTasks: [],
          activeGoals: [],
          stats: {
            overdueCount: 0,
            completedThisWeek: 0,
            activeGoalsCount: 0,
          },
          recentActivity: [],
        }) as never,
      resolveEmail: async (userId) => {
        if (failResolveFor.has(userId)) throw new Error("lookup exploded");
        return `e-${userId}`;
      },
      sendEmail: async ({ to }) => {
        if (failSendFor.has(to)) throw new Error("smtp down");
        sentEmails.push(to);
        return { id: "resend-1" };
      },
      recordDelivery: vi.fn(async () => {}),
      appUrl: "http://localhost:3000",
      windowMinutes: 30,
    };
  }

  it("completes the run when one candidate throws in the dedupe check", async () => {
    failDedupeFor.add("user-2");
    const result = await realRunBriefDispatch(baseDeps());
    expect(result.candidates).toBe(3);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures).toEqual(["user-2"]);
    expect(sentEmails.sort()).toEqual(["e-user-1", "e-user-3"]);
  });

  it("isolates resolveEmail and send failures, reporting them per candidate", async () => {
    failResolveFor.add("user-2");
    failSendFor.add("e-user-3");
    const result = await realRunBriefDispatch(baseDeps());
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.failures.sort()).toEqual(["user-2", "user-3"]);
  });

  it("a failing delivery record never aborts the run or hides the send", async () => {
    const deps = baseDeps();
    deps.recordDelivery = vi.fn(async () => {
      throw new Error("log write failed");
    });
    const result = await realRunBriefDispatch(deps);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
  });
});

describe("cron response reflects outcomes", () => {
  it("returns 200 with the result payload including failures", async () => {
    process.env.CRON_SECRET = SECRET;
    vi.mocked(runBriefDispatch).mockResolvedValueOnce({
      candidates: 2,
      due: 2,
      sent: 1,
      skipped: 0,
      failed: 1,
      failures: ["user-9"],
    });
    const res = await POST(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; result: { failed: number; failures: string[] } };
    expect(body.ok).toBe(true);
    expect(body.result.failed).toBe(1);
    expect(body.result.failures).toEqual(["user-9"]);
  });
});
