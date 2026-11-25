"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { ChartColumnIncreasingIcon } from "@/components/icons";

import {
  AnalyticsPanel,
  MetricBar,
  type ChartBarTone,
} from "@/components/dashboard/analytics/analytics-panel";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

interface ExecutionLoadPanelProps {
  load: DashboardAnalytics["executionLoad"];
}

export function ExecutionLoadPanel({ load }: ExecutionLoadPanelProps) {
  const { t } = useI18n();
  const max = Math.max(
    1,
    load.today,
    load.overdue,
    load.focus,
    load.inProgress,
    load.completedThisWeek,
  );
  const rows: Array<{
    label: string;
    value: number;
    tone: ChartBarTone;
    valueClassName?: string;
  }> = [
    { label: "Today", value: load.today, tone: "action" },
    {
      label: "Overdue",
      value: load.overdue,
      tone: "risk",
      valueClassName: "text-analytics-risk",
    },
    { label: "Focus", value: load.focus, tone: "accent" },
    { label: t("executionLoadPanel.inProgress"), value: load.inProgress, tone: "action" },
    { label: t("executionLoadPanel.completedThisWeek"), value: load.completedThisWeek, tone: "success" },
  ];

  return (
    <AnalyticsPanel title={t("executionLoadPanel.executionLoad")} icon={ChartColumnIncreasingIcon}>
      <div className="space-y-3.5" data-slot="execution-load-bars">
        {rows.map((row) => (
          <MetricBar
            key={row.label}
            label={row.label}
            value={row.value}
            max={max}
            tone={row.tone}
            valueClassName={row.valueClassName}
          />
        ))}
      </div>
    </AnalyticsPanel>
  );
}
