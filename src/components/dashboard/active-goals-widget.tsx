"use client";

import ProgressRing from "@/components/charts/progress-ring";
import { Card, CardContent } from "@/components/ui/card";
import type { TodayData } from "@/lib/services/dashboard.service";
import { formatDate } from "@/lib/format";

interface ActiveGoalsWidgetProps {
  goals: TodayData["activeGoals"];
}

export function ActiveGoalsWidget({ goals }: ActiveGoalsWidgetProps) {
  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No active goals yet. Set a goal to start tracking progress.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {goals.map((goal) => (
        <Card
          key={goal.id}
          className="flex-shrink-0 w-48 border hover:border-primary/40 transition-colors"
        >
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{goal.title}</p>
                {goal.areaName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {goal.areaName}
                  </p>
                )}
              </div>
              <ProgressRing
                percentage={goal.progress}
                size={36}
                strokeWidth={3}
                className="flex-shrink-0"
              />
            </div>
            {goal.targetDate && (
              <p className="text-xs text-muted-foreground">
                Target:{" "}
                {formatDate(goal.targetDate)}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}