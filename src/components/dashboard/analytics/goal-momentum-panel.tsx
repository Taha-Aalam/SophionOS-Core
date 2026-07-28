"use client";

import { PieChart } from "lucide-react";

import { AnalyticsPanel } from "@/components/dashboard/analytics/analytics-panel";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

interface GoalMomentumPanelProps {
  momentum: DashboardAnalytics["goalMomentum"];
}

const SIZE = 128;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * True SVG donut/ring (Stitch Goal Momentum). Segments are arc strokes, not a
 * filled pie disc — matches the thick multi-color ring in the reference.
 */
export function GoalMomentumPanel({ momentum }: GoalMomentumPanelProps) {
  const stuck = momentum.buckets.stuck;
  const moving = momentum.buckets.moving;
  const almostDone = momentum.buckets.almostDone;
  const total = stuck + moving + almostDone;
  const denom = Math.max(1, total);

  const segments =
    total === 0
      ? [{ key: "empty", value: 1, color: "var(--muted, oklch(0.93 0.01 260))" }]
      : [
          { key: "stuck", value: stuck, color: "var(--analytics-risk, oklch(0.55 0.2 27))" },
          { key: "moving", value: moving, color: "var(--analytics-action, oklch(0.58 0.14 260))" },
          { key: "almostDone", value: almostDone, color: "var(--analytics-accent, oklch(0.56 0.12 315))" },
        ].filter((s) => s.value > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const length = (seg.value / denom) * CIRCUMFERENCE;
    const dashOffset = -offset;
    offset += length;
    return { ...seg, length, dashOffset };
  });

  return (
    <AnalyticsPanel
      title="Goal Momentum"
      icon={PieChart}
      contentClassName="flex min-h-[160px] items-center justify-center"
    >
      <div className="relative flex w-full flex-wrap items-center justify-center gap-8 py-1">
        <div
          className="relative shrink-0"
          style={{ width: SIZE, height: SIZE }}
          aria-label="Goal progress buckets"
          data-slot="goal-momentum-ring"
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            role="img"
            aria-hidden="true"
          >
            {/* Track ring */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={STROKE}
            />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                className="momentum-ring-segment"
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold leading-none tabular-nums text-foreground transition-colors duration-200 ease-[var(--ease-out-quint)]">
              {total}
            </span>
            <span className="mt-1 text-2xs text-muted-foreground">goals</span>
          </div>
        </div>
        <div className="min-w-[7.5rem] space-y-2.5">
          <LegendRow label="Stuck" value={stuck} color="var(--analytics-risk, oklch(0.55 0.2 27))" />
          <LegendRow label="Moving" value={moving} color="var(--analytics-action, oklch(0.58 0.14 260))" />
          <LegendRow
            label="Almost done"
            value={almostDone}
            color="var(--analytics-accent, oklch(0.56 0.12 315))"
          />
        </div>
      </div>
    </AnalyticsPanel>
  );
}

function LegendRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="size-3 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span>
        {label}: <span className="font-medium tabular-nums text-foreground">{value}</span>
      </span>
    </div>
  );
}
