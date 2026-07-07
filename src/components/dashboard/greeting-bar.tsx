"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
        <h1 className="text-2xl font-semibold tracking-tight font-heading">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          You have {stats.remainingTasksCount} active task
          {stats.remainingTasksCount === 1 ? "" : "s"} remaining.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatChip label="Active areas" value={stats.activeAreasCount} accent="text-purple-600" />
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
          icon={stats.overdueCount > 0 ? <AlertTriangle className="size-3.5 text-red-600" /> : undefined}
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

function StatChip({ label, value, accent, icon }: { label: string; value: number; accent?: string; icon?: React.ReactNode }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || value === 0) {
      /* eslint-disable react-hooks/set-state-in-effect -- early-return sync set before any async work */
      setDisplayed(value);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const duration = 250;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayed(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <div className="flex items-baseline gap-1.5 rounded-full bg-card px-3 py-1 shadow-soft ring-1 ring-foreground/10 transition-colors">
      {icon}
      <span className={`text-lg font-semibold tabular-nums ${accent ?? ""}`}>{displayed}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
