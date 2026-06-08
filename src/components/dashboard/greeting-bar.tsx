"use client";

export interface DashboardStats {
  activeAreasCount: number;
  activeGoalsCount: number;
  activeProjectsCount: number;
  remainingTasksCount: number;
  remainingNotesCount: number;
  remainingResourcesCount: number;
  overdueCount: number;
  completedThisWeek: number;
}

interface GreetingBarProps {
  userName: string | undefined;
  stats: DashboardStats;
}

export function GreetingBar({ userName, stats }: GreetingBarProps) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          You have {stats.remainingTasksCount} active task
          {stats.remainingTasksCount === 1 ? "" : "s"} remaining.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatChip label="Active areas" value={stats.activeAreasCount} accent="text-indigo-600" />
        <StatChip label="Active goals" value={stats.activeGoalsCount} accent="text-blue-600" />
        <StatChip
          label="Active projects"
          value={stats.activeProjectsCount}
          accent="text-teal-600"
        />
        <StatChip
          label="Remaining tasks"
          value={stats.remainingTasksCount}
          accent="text-cyan-600"
        />
        <StatChip
          label="Remaining notes"
          value={stats.remainingNotesCount}
          accent="text-purple-600"
        />
        <StatChip
          label="Remaining resources"
          value={stats.remainingResourcesCount}
          accent="text-emerald-600"
        />
        <StatChip
          label="Overdue tasks"
          value={stats.overdueCount}
          accent={stats.overdueCount > 0 ? "text-red-600" : undefined}
        />
        <StatChip
          label="Completed this week"
          value={stats.completedThisWeek}
          accent="text-green-600"
        />
      </div>
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-full bg-muted px-3 py-1">
      <span className={`text-lg font-semibold tabular-nums ${accent ?? ""}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
