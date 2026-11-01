"use client";

import type { ComponentType } from "react";

import {
  CheckCheckIcon,
  CrosshairIcon,
  RocketIcon,
  TriangleAlertIcon,
} from "@/components/icons";

import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";
import { cn } from "@/lib/utils";

interface KpiStripProps {
  kpis: DashboardAnalytics["kpis"];
}

type KpiIcon = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: "true" | "false";
}>;

const items: Array<{
  key: keyof DashboardAnalytics["kpis"];
  label: string;
  icon: KpiIcon;
  chipClass: string;
  valueClass?: string;
}> = [
  {
    key: "focusTasks",
    label: "Focus Tasks",
    icon: CrosshairIcon,
    chipClass: "bg-analytics-action/10 text-analytics-action",
  },
  {
    key: "overdueTasks",
    label: "Overdue",
    icon: TriangleAlertIcon,
    chipClass: "bg-analytics-risk/10 text-analytics-risk",
    valueClass: "text-analytics-risk",
  },
  {
    key: "completedThisWeek",
    label: "Completed (Week)",
    icon: CheckCheckIcon,
    chipClass: "bg-analytics-success/10 text-analytics-success",
  },
  {
    key: "activeGoals",
    label: "Active Goals",
    icon: RocketIcon,
    chipClass: "bg-analytics-accent/10 text-analytics-accent",
  },
];

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <section
      aria-label="Dashboard key metrics"
      className="kpi-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const value = kpis[item.key];
        const isRisk = item.key === "overdueTasks" && value > 0;
        return (
          <div
            key={item.key}
            className={cn(
              "group flex h-[5.5rem] flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-soft",
              "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-quint)]",
              "hover:border-border hover:shadow-soft-lg active:scale-[0.99]",
              isRisk && "border-analytics-risk/25",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  item.chipClass,
                )}
              >
                <Icon size={14} aria-hidden="true" />
              </div>
            </div>
            <div
              className={cn(
                "text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground",
                "transition-colors duration-200 ease-[var(--ease-out-quint)]",
                item.valueClass,
              )}
            >
              {value}
            </div>
          </div>
        );
      })}
    </section>
  );
}
