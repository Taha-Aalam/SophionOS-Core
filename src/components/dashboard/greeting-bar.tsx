"use client";

import type { TodayStats } from "@/lib/services/dashboard.service";

interface GreetingBarProps {
  userName: string | undefined;
  tasksTodayCount: number;
  stats: TodayStats;
}

export function GreetingBar({
  userName,
  tasksTodayCount,
  stats,
}: GreetingBarProps) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tasksTodayCount === 0
            ? "You're all caught up — no tasks due today."
            : `You have ${tasksTodayCount} task${tasksTodayCount === 1 ? "" : "s"} due today.`}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        <StatChip
          label="Completed this week"
          value={stats.completedThisWeek}
          accent="text-green-600"
        />
        <StatChip
          label="Overdue"
          value={stats.overdueCount}
          accent={stats.overdueCount > 0 ? "text-red-600" : undefined}
        />
        <StatChip
          label="Active goals"
          value={stats.activeGoalsCount}
          accent="text-blue-600"
        />
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-full bg-muted px-3 py-1">
      <span className={`text-lg font-semibold tabular-nums ${accent ?? ""}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}