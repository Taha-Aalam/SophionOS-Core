import { describe, expect, it } from "vitest";
import type { TodayData } from "@/lib/services/dashboard.service";
import {
  buildBriefDataSummary,
  buildBriefPrompt,
} from "./brief-prompt";

const today: TodayData = {
  greeting: "Hi",
  tasksTodayCount: 7,
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
      projectName: "Finance",
      areaId: null,
      areaName: null,
    },
    {
      id: "t2",
      title: "Review Apollo brief",
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
  activeGoals: [
    {
      id: "g1",
      title: "Marathon training",
      description: null,
      progress: 45,
      targetDate: null,
      areaName: null,
    },
  ],
  stats: {
    completedThisWeek: 12,
    activeGoalsCount: 2,
    overdueCount: 2,
  },
  recentActivity: [],
};

describe("buildBriefDataSummary", () => {
  it("renders the same stats the deterministic brief carries", () => {
    const summary = buildBriefDataSummary("morning_briefing", today, "2026-07-23");
    expect(summary).toContain("Overdue: 2");
    expect(summary).toContain("Due / focus items today: 7");
    expect(summary).toContain("Completed this week: 12");
    expect(summary).toContain("Active goals: 2");
    expect(summary).toContain("- Pay Q4 VAT [overdue]");
    expect(summary).toContain("- Review Apollo brief");
    expect(summary).toContain("- Marathon training (45%)");
    expect(summary).toContain("2026-07-23");
  });
});

describe("buildBriefPrompt", () => {
  it("gives each brief kind its own framing", () => {
    const morning = buildBriefPrompt("morning_briefing", today, "2026-07-23");
    const evening = buildBriefPrompt("evening_review", today, "2026-07-23");
    const weekly = buildBriefPrompt("weekly_digest", today, "2026-07-23");
    expect(morning.system).not.toEqual(evening.system);
    expect(evening.system).not.toEqual(weekly.system);
  });

  it("forbids inventing facts beyond the provided data", () => {
    const { system } = buildBriefPrompt("morning_briefing", today, "2026-07-23");
    expect(system).toMatch(/only/i);
    expect(system.toLowerCase()).toContain("do not invent");
  });

  it("bounds the length and embeds the data summary", () => {
    const { system, prompt } = buildBriefPrompt("weekly_digest", today, "2026-07-23");
    expect(system).toMatch(/120-180 words/i);
    expect(prompt).toContain("Pay Q4 VAT");
  });
});
