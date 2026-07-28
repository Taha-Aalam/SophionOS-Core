"use client";

import { CalendarDays } from "lucide-react";
import { memo, useMemo, type CSSProperties } from "react";

import { AnalyticsPanel } from "@/components/dashboard/analytics/analytics-panel";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

interface ActivityHeatmapProps {
  heatmap: DashboardAnalytics["heatmap"];
}

type HeatDay = DashboardAnalytics["heatmap"]["days"][number];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Discrete 0–4 intensity like GitHub contribution graph. */
export function activityIntensityLevel(total: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  const ratio = total / Math.max(1, max);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Solid colors so empty past-day boxes always paint. */
export function heatmapCellBackground(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 0:
      return "var(--heatmap-empty, oklch(0.9 0.01 260))";
    case 1:
      return "var(--heatmap-1, oklch(0.88 0.06 155))";
    case 2:
      return "var(--heatmap-2, oklch(0.78 0.1 155))";
    case 3:
      return "var(--heatmap-3, oklch(0.68 0.12 155))";
    case 4:
      return "var(--analytics-success, oklch(0.62 0.13 155))";
  }
}

function cellStyle(level: 0 | 1 | 2 | 3 | 4, options?: { invisible?: boolean }): CSSProperties {
  return {
    width: "100%",
    aspectRatio: "1",
    borderRadius: 2,
    boxSizing: "border-box",
    backgroundColor: heatmapCellBackground(level),
    opacity: options?.invisible ? 0 : 1,
    // Position for hover scale without shifting the grid.
    position: "relative" as const,
  };
}

/**
 * GitHub contribution graph: last ~year of days in a 7-row × ~53-week grid,
 * month labels, weekday labels, Less/More legend. Cells scale to panel width.
 */
function ActivityHeatmapImpl({ heatmap }: ActivityHeatmapProps) {
  const days = heatmap.days;
  const { max, cells, weekCount, months, activeDays } = useMemo(() => {
    let peak = 1;
    let active = 0;
    for (const day of days) {
      if (day.total > peak) peak = day.total;
      if (day.total > 0) active += 1;
    }
    const padded = padTrailingWeeks(days);
    const weeks = Math.max(1, Math.ceil(padded.length / 7));
    return {
      max: peak,
      cells: padded,
      weekCount: weeks,
      months: monthLabelsForWeeks(padded, weeks),
      activeDays: active,
    };
  }, [days]);

  return (
    <AnalyticsPanel
      title="Activity Map (Last Year)"
      description={`${activeDays} active day${activeDays === 1 ? "" : "s"} across the last year`}
      icon={CalendarDays}
      className="h-full"
      contentClassName="flex h-full flex-col"
    >
      <div
        className="flex w-full flex-1 flex-col justify-center gap-2"
        data-slot="activity-heatmap"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 140px" }}
      >
        {/* Month labels row (aligned with week columns) */}
        <div className="flex w-full gap-2">
          <div className="w-7 shrink-0" aria-hidden="true" />
          <div
            className="relative min-h-4 min-w-0 flex-1"
            aria-hidden="true"
          >
            {months.map((m) => (
              <span
                key={`${m.label}-${m.weekIndex}`}
                className="absolute top-0 text-[10px] font-medium leading-none text-muted-foreground"
                style={{
                  left: `${(m.weekIndex / weekCount) * 100}%`,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex w-full gap-2">
          <div
            className="flex w-7 shrink-0 flex-col justify-between py-px text-[10px] font-medium leading-none text-muted-foreground"
            aria-hidden="true"
          >
            <span className="flex flex-1 items-center">Mon</span>
            <span className="flex flex-1 items-center">Wed</span>
            <span className="flex flex-1 items-center">Fri</span>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="grid w-full"
              aria-label="Daily activity heatmap"
              data-week-count={weekCount}
              data-day-count={days.length}
              style={{
                gridTemplateRows: "repeat(7, minmax(0, 1fr))",
                gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
                gridAutoFlow: "column",
                gap: 3,
                // Keep squares roughly GitHub-scale but fill card width.
                // 7 rows + gaps ≈ square cells when width is ~53 columns.
                aspectRatio: `${weekCount} / 7`,
                maxHeight: 140,
                minHeight: 96,
              }}
            >
              {cells.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`pad-${index}`}
                      style={cellStyle(0, { invisible: true })}
                      aria-hidden="true"
                    />
                  );
                }

                const level = activityIntensityLevel(day.total, max);
                const isEmpty = day.total <= 0;
                return (
                  <div
                    key={day.date}
                    className="heatmap-day-cell"
                    title={
                      isEmpty
                        ? `${day.date}: no activity`
                        : `${day.date}: ${day.completed} completed, ${day.captured} captured`
                    }
                    style={cellStyle(level)}
                    data-date={day.date}
                    data-level={level}
                    data-total={day.total}
                    data-empty={isEmpty ? "true" : "false"}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground"
          aria-hidden="true"
        >
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              style={{
                ...cellStyle(level),
                width: 12,
                height: 12,
                aspectRatio: undefined,
              }}
              data-legend-level={level}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </AnalyticsPanel>
  );
}

export const ActivityHeatmap = memo(ActivityHeatmapImpl);

/** Pad only the trailing partial week; leading Monday alignment is done in data. */
function padTrailingWeeks(days: HeatDay[]): Array<HeatDay | null> {
  if (days.length === 0) return [];
  const padded: Array<HeatDay | null> = [...days];
  const rem = padded.length % 7;
  if (rem !== 0) {
    padded.push(...Array.from({ length: 7 - rem }, () => null));
  }
  return padded;
}

/** Month labels at the first week column where that month appears. */
function monthLabelsForWeeks(
  cells: Array<HeatDay | null>,
  weekCount: number,
): Array<{ label: string; weekIndex: number }> {
  const labels: Array<{ label: string; weekIndex: number }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weekCount; w++) {
    // Prefer a mid-week day in the column for stable month detection.
    const sample = cells[w * 7 + 3] ?? cells[w * 7] ?? null;
    if (!sample) continue;
    const month = Number(sample.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      labels.push({ label: MONTH_SHORT[month] ?? sample.date.slice(5, 7), weekIndex: w });
      lastMonth = month;
    }
  }
  return labels;
}
