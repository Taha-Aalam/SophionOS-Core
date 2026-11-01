"use client";

import {
  FolderClockIcon,
  HeartPulseIcon,
  Link2OffIcon,
  RocketIcon,
  TriangleAlertIcon,
} from "@/components/icons";

import { AnalyticsPanel } from "@/components/dashboard/analytics/analytics-panel";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

interface WorkHealthPanelProps {
  health: DashboardAnalytics["workHealth"];
}

export function WorkHealthPanel({ health }: WorkHealthPanelProps) {
  const rows = [
    {
      label: "Overdue by area",
      value: health.overdueByArea[0]?.count ?? 0,
      detail: health.overdueByArea[0]?.name ?? "No overdue areas",
      icon: TriangleAlertIcon,
      tone: "risk" as const,
    },
    {
      label: "Overdue by project",
      value: health.overdueByProject[0]?.count ?? 0,
      detail: health.overdueByProject[0]?.name ?? "No overdue projects",
      icon: FolderClockIcon,
      tone: "risk" as const,
    },
    {
      label: "Low progress near due",
      value: health.lowProgressNearDueGoals.length,
      detail: health.lowProgressNearDueGoals[0]?.name ?? "No goal risk",
      icon: RocketIcon,
      tone: "accent" as const,
    },
    {
      label: "Unassigned tasks",
      value: health.unassignedTasks,
      detail: "Missing area, project, and goal links",
      icon: Link2OffIcon,
      tone: "muted" as const,
    },
  ];

  return (
    <AnalyticsPanel
      title="Work Health"
      description="Overdue work, near-due goals, and unlinked tasks."
      icon={HeartPulseIcon}
      className="h-full"
      contentClassName="flex h-full flex-col"
    >
      {/* Always 2×2 so height stays close to the Activity Map when paired. */}
      <div className="grid flex-1 grid-cols-2 gap-2 content-stretch">
        {rows.map((row) => {
          const Icon = row.icon;
          const chip =
            row.tone === "risk"
              ? "bg-analytics-risk/10 text-analytics-risk"
              : row.tone === "accent"
                ? "bg-analytics-accent/10 text-analytics-accent"
                : "bg-muted text-muted-foreground";
          return (
            <div
              key={row.label}
              className="flex min-h-0 flex-col justify-between rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 transition-[background-color,border-color] duration-200 ease-[var(--ease-out-quint)] hover:border-border/80 hover:bg-muted/45"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-2xs leading-snug text-muted-foreground">
                  {row.label}
                </span>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${chip}`}
                >
                  <Icon size={12} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-1.5 min-w-0">
                <p className="text-lg font-semibold leading-none tabular-nums text-foreground">
                  {row.value}
                </p>
                <p className="mt-1 truncate text-2xs text-muted-foreground">
                  {row.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsPanel>
  );
}
