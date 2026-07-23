"use client";

import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AnalyticsPanelProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

/** Shared surface for dashboard analytics panels. Soft elevation, consistent radius. */
export function AnalyticsPanel({
  title,
  description,
  icon: Icon,
  iconClassName,
  className,
  contentClassName,
  children,
}: AnalyticsPanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-border/70 bg-card p-4 text-card-foreground shadow-soft",
        className,
      )}
    >
      <header className={cn("flex items-center gap-2", description ? "mb-1" : "mb-3.5")}>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground",
              iconClassName,
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
        <h3 className="text-sm font-semibold leading-5 tracking-tight text-foreground">
          {title}
        </h3>
      </header>
      {description ? (
        <p className="mb-3.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
    </section>
  );
}

export type ChartBarTone = "action" | "risk" | "success" | "accent";

/** Hard oklch fallbacks so bars paint even if theme tokens are missing. */
const TONE_COLOR: Record<ChartBarTone, string> = {
  action: "var(--analytics-action, oklch(0.58 0.14 260))",
  risk: "var(--analytics-risk, oklch(0.55 0.2 27))",
  success: "var(--analytics-success, oklch(0.62 0.13 155))",
  accent: "var(--analytics-accent, oklch(0.56 0.12 315))",
};

/**
 * Horizontal load bar. Uses inline colors + Tailwind layout so fills always paint
 * even if custom @layer utility classes are dropped from the CSS bundle.
 */
export function MetricBar({
  label,
  value,
  max,
  tone = "action",
  valueClassName,
}: {
  label: string;
  value: number;
  max: number;
  tone?: ChartBarTone;
  valueClassName?: string;
}) {
  const raw = (value / Math.max(1, max)) * 100;
  // Visible floor when value > 0; empty track when value is 0.
  const pct = value <= 0 ? 0 : Math.max(10, Math.min(100, Math.round(raw)));
  const fillColor = TONE_COLOR[tone];

  const trackStyle: CSSProperties = {
    height: 8,
    width: "100%",
    borderRadius: 9999,
    overflow: "hidden",
    // Solid fallback track (no color-mix) so the rail always shows.
    backgroundColor: "var(--muted, oklch(0.93 0.01 260))",
  };

  const fillStyle: CSSProperties = {
    display: "block",
    height: "100%",
    width: `${pct}%`,
    borderRadius: 9999,
    backgroundColor: fillColor,
    minWidth: value > 0 ? 6 : 0,
    transition: "width 300ms cubic-bezier(0.22, 1, 0.36, 1)",
  };

  return (
    <div data-slot="metric-bar" data-label={label} data-value={value}>
      <div className="mb-1.5 flex justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums text-foreground", valueClassName)}>
          {value}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        data-slot="chart-bar-track"
        style={trackStyle}
      >
        <div
          data-slot="chart-bar-fill"
          data-testid="chart-bar-segment"
          data-tone={tone}
          style={fillStyle}
        />
      </div>
    </div>
  );
}
