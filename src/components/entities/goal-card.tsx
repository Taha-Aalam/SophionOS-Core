"use client";

import React from 'react';
import { Calendar, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Goal } from '@/lib/types/domain.types';
import ProgressRing from '@/components/charts/progress-ring';

interface GoalCardProps {
  goal: Goal;
  areaName?: string;
  onEdit?: (goal: Goal) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const TERM_LABELS: Record<string, string> = {
  short: 'Short Term',
  mid: 'Mid Term',
  long: 'Long Term',
};

function parseGoalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function calculateDueState(targetDate: string | null): { text: string; isOverdue: boolean } {
  if (!targetDate) {
    return { text: 'No due date', isOverdue: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = parseGoalDate(targetDate);
  const dayDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (dayDiff < 0) {
    return { text: `Overdue • ${formattedDate}`, isOverdue: true };
  }

  if (dayDiff === 0) {
    return { text: `Due today • ${formattedDate}`, isOverdue: false };
  }

  const remainingLabel = dayDiff === 1 ? '1 day left' : `${dayDiff}d left`;
  return {
    text: `Due ${formattedDate} • ${remainingLabel}`,
    isOverdue: false,
  };
}

export function GoalCard({ goal, areaName, onEdit }: GoalCardProps) {
  const dueState = calculateDueState(goal.target_date);
  const resolvedAreaName = areaName?.trim() || 'Unassigned';
  const isInteractive = typeof onEdit === 'function';

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all",
        isInteractive && "cursor-pointer hover:ring-2 hover:ring-primary/20",
        goal.is_archived && "opacity-60 grayscale"
      )}
      onClick={() => onEdit?.(goal)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Target className="size-4 text-muted-foreground" />
              <h3 className="font-medium truncate text-sm">{goal.name}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {resolvedAreaName}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.medium)}
              >
                {goal.priority}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {TERM_LABELS[goal.term] || goal.term}
              </Badge>
            </div>

            {goal.description && (
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {goal.description}
              </p>
            )}
          </div>

          <ProgressRing
            percentage={goal.progress}
            size={48}
            strokeWidth={4}
            className="shrink-0"
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span className={cn(dueState.isOverdue && "text-destructive font-medium")}>
              {dueState.text}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {goal.is_completed && (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">
                Completed
              </Badge>
            )}
            {goal.is_archived && (
              <Badge variant="outline">
                Archived
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
