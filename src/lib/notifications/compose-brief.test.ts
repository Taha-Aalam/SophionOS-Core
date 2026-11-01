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

describe("composeBriefEmail AI narration", () => {
  const base = {
    kind: "morning_briefing" as const,
    today: sampleToday,
    appUrl: "https://app.example.com",
    localDate: "2026-09-14",
  };

  it("renders the narration as a labeled intro in text and html", () => {
    const mail = composeBriefEmail({
      ...base,
      narration: {
        text: "Focus on the VAT return first.\n\nThen the Apollo review.",
        provider: "openrouter",
      },
    });
    expect(mail.text).toContain("AI summary (via openrouter)");
    expect(mail.text).toContain("Focus on the VAT return first.");
    expect(mail.html).toContain("generated with your connected openrouter key");
    expect(mail.html).toContain("Focus on the VAT return first.");
  });

  it("escapes narration text in the html part", () => {
    const mail = composeBriefEmail({
      ...base,
      narration: { text: "<script>alert(1)</script>", provider: "p" },
    });
    expect(mail.html).not.toContain("<script>alert");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("omits the section without narration and keeps the subject stable", () => {
    const plain = composeBriefEmail(base);
    const narrated = composeBriefEmail({
      ...base,
      narration: { text: "Morning!", provider: "openai" },
    });
    expect(plain.text).not.toContain("AI summary");
    expect(plain.subject).toBe(narrated.subject);
  });
});
