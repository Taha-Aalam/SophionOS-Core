"use client";

import { AlertTriangle, CheckCircle2, Crosshair, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";
import { cn } from "@/lib/utils";

interface KpiStripProps {
  kpis: DashboardAnalytics["kpis"];
}

const items: Array<{
  key: keyof DashboardAnalytics["kpis"];
  label: string;
  icon: LucideIcon;
  chipClass: string;
  valueClass?: string;
}> = [
  {
    key: "focusTasks",
    label: "Focus Tasks",
    icon: Crosshair,
    chipClass: "bg-analytics-action/10 text-analytics-action",
  },
  {
    key: "overdueTasks",
    label: "Overdue",
    icon: AlertTriangle,
    chipClass: "bg-analytics-risk/10 text-analytics-risk",
    valueClass: "text-analytics-risk",
  },
  {
    key: "completedThisWeek",
    label: "Completed (Week)",
    icon: CheckCircle2,
    chipClass: "bg-analytics-success/10 text-analytics-success",
  },
  {
    key: "activeGoals",
    label: "Active Goals",
    icon: Target,
    chipClass: "bg-analytics-accent/10 text-analytics-accent",
  },
];

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <section
      aria-label="Dashboard key metrics"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const value = kpis[item.key];
        return (
          <div
            key={item.key}
            className="group flex h-[5.5rem] flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-soft transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-quint)] hover:border-border active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105",
                  item.chipClass,
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </div>
            </div>
            <div
              className={cn(
                "text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground",
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
