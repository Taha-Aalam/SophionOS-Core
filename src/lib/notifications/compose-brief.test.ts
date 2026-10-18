import { describe, expect, it } from "vitest";
import { composeBriefEmail } from "./compose-brief";
import type { TodayData } from "@/lib/services/dashboard.service";

const sampleToday: TodayData = {
  greeting: "Good morning",
  tasksTodayCount: 2,
  todayTasks: [
    {
      id: "t1",
      title: "Ship plan",
      description: null,
      dueDate: "2026-07-23",
      priority: "high",
      status: "pending",
      isOverdue: false,
      projectId: null,
      projectName: null,
      areaId: null,
      areaName: null,
    },
  ],
  activeGoals: [
    {
      id: "g1",
      title: "Launch",
      description: null,
      progress: 40,
      targetDate: null,
      areaName: null,
    },
  ],
  stats: { completedThisWeek: 3, activeGoalsCount: 1, overdueCount: 1 },
  recentActivity: [],
};

describe("composeBriefEmail", () => {
  it("builds morning subject and includes task title", () => {
    const mail = composeBriefEmail({
      kind: "morning_briefing",
      today: sampleToday,
      appUrl: "https://app.example.com",
      localDate: "2026-07-23",
    });
    expect(mail.subject).toMatch(/morning/i);
    expect(mail.text).toContain("Ship plan");
    expect(mail.text).toContain("https://app.example.com/dashboard");
    expect(mail.html).toContain("Ship plan");
  });
});

const POLICY_PATHS = [
  "/terms",
  "/privacy",
  "/security",
  "/subprocessors",
  "/data-and-ai",
  "/responsible-disclosure",
] as const;

describe("composeBriefEmail policy footer", () => {
  const mail = composeBriefEmail({
    kind: "morning_briefing",
    today: sampleToday,
    appUrl: "https://app.example.com",
    localDate: "2026-09-14",
  });

  it("links every policy page in the plain-text footer", () => {
    for (const path of POLICY_PATHS) {
      expect(mail.text).toContain(`https://app.example.com${path}`);
    }
  });

  it("links every policy page in the HTML footer", () => {
    for (const path of POLICY_PATHS) {
      expect(mail.html).toContain(`href="https://app.example.com${path}"`);
    }
  });

  it("strips a trailing slash so links never double up", () => {
    const trailing = composeBriefEmail({
      kind: "morning_briefing",
      today: sampleToday,
      appUrl: "https://app.example.com/",
      localDate: "2026-09-14",
    });
    expect(trailing.html).toContain('href="https://app.example.com/terms"');
    expect(trailing.html).not.toContain("example.com//terms");
    expect(trailing.text).not.toContain("example.com//terms");
  });

  it("keeps the dashboard link and sign-off", () => {
    expect(mail.text).toContain("https://app.example.com/dashboard");
    expect(mail.text).toContain("— SophionOS");
  });
});
