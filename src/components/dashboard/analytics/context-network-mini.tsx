"use client";

import { ArrowRight, Network } from "lucide-react";
import type { CSSProperties } from "react";

import { AnalyticsPanel } from "@/components/dashboard/analytics/analytics-panel";
import { Button } from "@/components/ui/button";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

interface ContextNetworkMiniProps {
  network: DashboardAnalytics["contextNetwork"];
}

function densityLabel(score: number): string {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function ContextNetworkMini({ network }: ContextNetworkMiniProps) {
  const columns = [
    { label: "Areas", value: network.areaNodes },
    { label: "Goals", value: network.goalNodes },
    { label: "Projects", value: network.projectNodes },
    { label: "Tasks", value: network.taskNodes },
  ];
  const label = densityLabel(network.densityScore);
  const barWidth = Math.max(0, Math.min(100, network.densityScore));

  const trackStyle: CSSProperties = {
    height: 10,
    width: "100%",
    borderRadius: 9999,
    overflow: "hidden",
    backgroundColor: "var(--muted, oklch(0.93 0.01 260))",
  };
  const fillStyle: CSSProperties = {
    display: "block",
    height: "100%",
    width: `${barWidth}%`,
    borderRadius: 9999,
    backgroundColor: "var(--analytics-success, oklch(0.62 0.13 155))",
    minWidth: barWidth > 0 ? 6 : 0,
    transition: "width 280ms var(--ease-out-quint)",
  };

  return (
    <AnalyticsPanel
      title="Context Network"
      description="How tightly areas, goals, projects, and tasks link together."
      icon={Network}
    >
      <div className="mb-5 grid grid-cols-4 gap-2">
        {columns.map((column) => (
          <div
            key={column.label}
            className="min-w-0 rounded-lg bg-muted/40 px-1.5 py-2 text-center"
          >
            <div className="text-2xs text-muted-foreground">{column.label}</div>
            <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {column.value}
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">Density score</span>
          <span
            className="font-semibold tabular-nums"
            style={{ color: "var(--analytics-success)" }}
          >
            {label} ({network.densityScore}%)
          </span>
        </div>
        <div
          role="meter"
          aria-label="Density Score"
          aria-valuenow={network.densityScore}
          aria-valuemin={0}
          aria-valuemax={100}
          data-slot="chart-bar-track"
          style={trackStyle}
        >
          <div
            data-testid="chart-bar-segment"
            className={barWidth > 0 ? "metric-bar-fill" : undefined}
            style={fillStyle}
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full cursor-pointer"
        nativeButton={false}
        render={<a href="/dashboard/network" />}
      >
        View full map
        <ArrowRight data-icon="inline-end" />
      </Button>
    </AnalyticsPanel>
  );
}
