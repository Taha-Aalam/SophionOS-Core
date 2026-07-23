import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ActivityHeatmap,
  ContextNetworkMini,
  ExecutionLoadPanel,
  GoalMomentumPanel,
  KpiStrip,
  KnowledgePipeline,
  RelationshipRiskPanel,
  WorkHealthPanel,
} from "@/components/dashboard/analytics";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

const fixture: DashboardAnalytics = {
  kpis: {
    focusTasks: 3,
    overdueTasks: 2,
    completedThisWeek: 5,
    activeGoals: 4,
  },
  executionLoad: {
    today: 3,
    overdue: 2,
    focus: 3,
    inProgress: 1,
    completedThisWeek: 5,
  },
  workHealth: {
    overdueByArea: [{ id: "a1", name: "Health", count: 2 }],
    overdueByProject: [{ id: "p1", name: "Launch", count: 1 }],
    stalledProjects: [],
    lowProgressNearDueGoals: [{ id: "g1", name: "Ship MVP", progress: 10, daysUntilDue: 5 }],
    unassignedTasks: 1,
  },
  knowledgePipeline: {
    capturedToday: 2,
    waitingReview: 4,
    saved: 8,
    archived: 1,
    backlog: 4,
    mostActiveTopics: [{ id: "t1", name: "AI Research", count: 3 }],
  },
  goalMomentum: {
    movingGoals: 2,
    stalledGoals: 1,
    buckets: { stuck: 1, moving: 2, almostDone: 1 },
  },
  relationshipRisk: {
    followUpsDue: 2,
    tiedToActiveProjects: 1,
    contacts: [
      { id: "c1", name: "Alex Rivera", daysOverdue: 14, activeProjectCount: 1 },
    ],
  },
  // ~1 year of days (Mon-aligned) for GitHub-style graph tests
  heatmap: {
    days: Array.from({ length: 371 }, (_, i) => {
      // 2025-07-14 is a Monday → through ~2026-07-19
      const d = new Date(2025, 6, 14 + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const total = i % 7 === 0 ? (i % 5) + 1 : 0;
      return {
        date: `${y}-${m}-${day}`,
        completed: total,
        captured: 0,
        total,
      };
    }),
  },
  contextNetwork: {
    areaNodes: 2,
    goalNodes: 4,
    projectNodes: 3,
    taskNodes: 10,
    links: [],
    densityScore: 72,
  },
};

describe("dashboard analytics panels (Stitch UI)", () => {
  it("KpiStrip renders live KPI labels and values from props", () => {
    const html = renderToStaticMarkup(<KpiStrip kpis={fixture.kpis} />);
    expect(html).toContain("Focus Tasks");
    expect(html).toContain("Overdue");
    expect(html).toContain("Completed (Week)");
    expect(html).toContain("Active Goals");
    expect(html).toContain(">3<");
    expect(html).toContain(">2<");
    expect(html).toContain(">5<");
    expect(html).toContain(">4<");
    expect(html).toContain('aria-label="Dashboard key metrics"');
  });

  it("ExecutionLoadPanel binds load values and renders chart bar segments", () => {
    const html = renderToStaticMarkup(
      <ExecutionLoadPanel load={fixture.executionLoad} />,
    );
    expect(html).toContain("Execution Load");
    expect(html).toContain("Today");
    expect(html).toContain("Overdue");
    expect(html).toContain("Focus");
    expect(html).toContain("In progress");
    expect(html).toContain("Completed this week");
    // Inline-styled bars (not custom CSS class names)
    expect(html).toContain('data-slot="chart-bar-track"');
    expect(html).toContain('data-slot="chart-bar-fill"');
    expect(html).toContain("var(--analytics-action,");
    expect(html).toContain("var(--analytics-risk,");
    // values from fixture: max is 5 → today=3 60%, overdue=2 40%, in progress=1 20%, completed=5 100%
    expect(html).toContain("width:60%");
    expect(html).toContain("width:40%");
    expect(html).toContain("width:20%");
    expect(html).toContain("width:100%");
    expect(html).toContain('data-value="3"');
    expect(html).toContain('data-value="2"');
    expect(html).toContain('data-value="5"');
    expect(html).toContain('role="meter"');
  });

  it("GoalMomentumPanel shows SVG ring, total, and bucket legend from props", () => {
    const html = renderToStaticMarkup(
      <GoalMomentumPanel momentum={fixture.goalMomentum} />,
    );
    expect(html).toContain("Goal Momentum");
    expect(html).toContain("Stuck:");
    expect(html).toContain("Moving:");
    expect(html).toContain("Almost done:");
    expect(html).toContain(">4<");
    expect(html).toContain('aria-label="Goal progress buckets"');
    expect(html).toContain('data-slot="goal-momentum-ring"');
    expect(html).toContain("<svg");
    expect(html).toContain("stroke-dasharray");
    expect(html).toContain("var(--analytics-risk,");
    expect(html).toContain("var(--analytics-action,");
    expect(html).toContain("var(--analytics-accent,");
  });

  it("ActivityHeatmap uses year-scale GitHub-style cells with levels from real day totals", () => {
    const html = renderToStaticMarkup(
      <ActivityHeatmap heatmap={fixture.heatmap} />,
    );
    expect(html).toContain("Activity Map (Last Year)");
    expect(html).toContain('aria-label="Daily activity heatmap"');
    expect(html).toContain("Less");
    expect(html).toContain("More");
    expect(html).toContain("Jan");
    // All real days present as data-date cells (year window)
    const dateAttrs = html.match(/data-date="/g) ?? [];
    expect(dateAttrs.length).toBe(fixture.heatmap.days.length);
    expect(dateAttrs.length).toBeGreaterThanOrEqual(365);
    // Zero-activity days render as empty boxes (data-empty=true), not omitted
    const zeroDay = fixture.heatmap.days.find((d) => d.total === 0);
    expect(zeroDay).toBeTruthy();
    if (zeroDay) {
      expect(html).toContain(`data-date="${zeroDay.date}"`);
      expect(html).toContain(`${zeroDay.date}: no activity`);
      expect(html).toContain('data-empty="true"');
      expect(html).toContain('data-level="0"');
    }
    const sample = fixture.heatmap.days.find((d) => d.total > 0)!;
    expect(html).toContain(
      `${sample.date}: ${sample.completed} completed, ${sample.captured} captured`,
    );
    expect(html).toContain(`data-date="${sample.date}"`);
    expect(html).toContain(`data-total="${sample.total}"`);
    // ~53 week columns for a year graph
    expect(html).toMatch(/data-week-count="5[2-4]"/);
  });

  it("WorkHealthPanel surfaces overdue and unassigned counts", () => {
    const html = renderToStaticMarkup(
      <WorkHealthPanel health={fixture.workHealth} />,
    );
    expect(html).toContain("Work Health");
    expect(html).toContain("Health");
    expect(html).toContain("Launch");
    expect(html).toContain("Ship MVP");
    expect(html).toContain("Unassigned tasks");
    expect(html).toContain(">1<");
  });

  it("KnowledgePipeline renders metrics and topic chips from props", () => {
    const html = renderToStaticMarkup(
      <KnowledgePipeline pipeline={fixture.knowledgePipeline} />,
    );
    expect(html).toContain("Knowledge Pipeline");
    expect(html).toContain("Captured");
    expect(html).toContain("Review");
    expect(html).toContain("AI Research");
    expect(html).toContain(">2<");
    expect(html).toContain(">4<");
    expect(html).toContain(">3<");
  });

  it("ContextNetworkMini shows node counts and density score", () => {
    const html = renderToStaticMarkup(
      <ContextNetworkMini network={fixture.contextNetwork} />,
    );
    expect(html).toContain("Context Network");
    expect(html).toContain("Areas");
    expect(html).toContain("Goals");
    expect(html).toContain("Projects");
    expect(html).toContain("Tasks");
    expect(html).toContain("High (72%)");
    expect(html).toContain(">2<");
    expect(html).toContain(">4<");
    expect(html).toContain(">10<");
  });

  it("RelationshipRiskPanel lists contacts and overdue summary", () => {
    const html = renderToStaticMarkup(
      <RelationshipRiskPanel risk={fixture.relationshipRisk} />,
    );
    expect(html).toContain("Relationship Risk");
    expect(html).toContain("Follow-ups due");
    expect(html).toContain("On active projects");
    expect(html).toContain("Alex Rivera");
    expect(html).toContain("14d overdue");
    expect(html).toContain(">2<");
    expect(html).toContain(">1<");
  });

  it("empty-ish relationship risk shows calm empty copy", () => {
    const empty: DashboardAnalytics["relationshipRisk"] = {
      followUpsDue: 0,
      tiedToActiveProjects: 0,
      contacts: [],
    };
    const html = renderToStaticMarkup(<RelationshipRiskPanel risk={empty} />);
    expect(html).toContain("No follow-up risk right now.");
    expect(html).toContain(">0<");
  });
});
