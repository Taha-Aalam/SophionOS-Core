"use client";

import React from 'react';
import { Archive, Calendar, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Goal } from '@/lib/types/domain.types';
import { PRIORITY_COLORS } from '@/lib/constants/entity-colors';
import { formatDate } from '@/lib/format';
import ProgressRing from '@/components/charts/progress-ring';

import { DeleteEntityPopover } from './delete-entity-popover';
import { useClickableProps } from '@/components/ui/clickable';

export interface GoalCardRollups {
  projectCount: number;
  taskCount: number;
  noteCount: number;
  resourceCount: number;
}

interface GoalCardProps {
  goal: Goal;
  areaName?: string;
  /**
   * When provided, renders chips for each linked area name (up to 2, with a
   * `+N` overflow chip). Falls back to `areaName` for backwards compatibility.
   */
  areaNames?: string[];
  areaIcons?: (string | null)[];
  onEdit?: (goal: Goal) => void;
  onRestore?: (goal: Goal) => void;
  onArchive?: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
  isDeleting?: boolean;
  duplicateIndex?: number;
  rollups?: GoalCardRollups;
}

const TERM_LABELS: Record<string, string> = {
  short: 'Short Term',
  mid: 'Mid Term',
  long: 'Long Term',
};

const TERM_COLORS: Record<string, string> = {
  short: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  mid: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  long: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

const TERM_EMOJIS: Record<string, string> = {
  short: '⚡',
  mid: '📅',
  long: '🏔️',
};

const BADGE_CLS = 'h-5 text-2xs leading-none px-1.5 py-0 items-center';

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
  const formattedDate = formatDate(dueDate);

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

export function GoalCard({ goal, areaName, areaNames, areaIcons, onEdit, onRestore, onArchive, onDelete, isDeleting, duplicateIndex, rollups }: GoalCardProps) {
  const dueState = calculateDueState(goal.target_date);
  const resolvedAreaNames = (() => {
    if (areaNames && areaNames.length > 0) {
      return areaNames.map((n) => n.trim()).filter(Boolean);
    }
    const fallback = areaName?.trim();
    return fallback ? [fallback] : ['Unassigned'];
  })();
  const isInteractive = typeof onEdit === 'function';

  const showDuplicateBadge = duplicateIndex != null && duplicateIndex > 1;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden",
        isInteractive && "cursor-pointer hover-lift",
        goal.is_archived && "opacity-60 grayscale"
      )}
      onClick={() => onEdit?.(goal)}
      {...(isInteractive ? useClickableProps(() => onEdit?.(goal)) : {})}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">🎯</span>
              <h3 className="font-medium truncate text-sm">{goal.name}</h3>
              {showDuplicateBadge && (
                <Badge variant="outline" className="text-2xs px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                  copy {duplicateIndex}
                </Badge>
              )}
              {rollups && rollups.projectCount === 0 && rollups.taskCount === 0 && rollups.noteCount === 0 && rollups.resourceCount === 0 && !goal.is_archived && (
                <Badge variant="outline" className="text-2xs px-1.5 py-0">
                  No activity
                </Badge>
              )}
              {goal.is_inactive && rollups && (rollups.projectCount > 0 || rollups.taskCount > 0 || rollups.noteCount > 0 || rollups.resourceCount > 0) && !goal.is_archived && (
                <Badge variant="outline" className="text-2xs px-1.5 py-0">
                  Paused
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {resolvedAreaNames.slice(0, 2).map((name, index) => (
                <Badge
                  key={`${name}-${index}`}
                  variant="outline"
                  className={BADGE_CLS}
                >
                  {areaIcons?.[index] ? `${areaIcons[index]} ` : ''}{name}
                </Badge>
              ))}
              {resolvedAreaNames.length > 2 && (
                <Badge variant="outline" className={BADGE_CLS}>
                  +{resolvedAreaNames.length - 2}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(BADGE_CLS, TERM_COLORS[goal.term] || TERM_COLORS.short)}
              >
                {TERM_EMOJIS[goal.term] ? `${TERM_EMOJIS[goal.term]} ` : ''}{TERM_LABELS[goal.term] || goal.term}
              </Badge>
              <Badge
                variant="outline"
                className={cn(BADGE_CLS, 'capitalize', PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.medium)}
              >
                {goal.priority}
              </Badge>
            </div>

            {goal.description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
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

        {rollups && (
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 whitespace-nowrap" title="Projects">
              <span className="text-xs">📁</span>
              <span>{rollups.projectCount}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap" title="Tasks">
              <span className="text-xs">☑️</span>
              <span>{rollups.taskCount}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap" title="Notes">
              <span className="text-xs">📝</span>
              <span>{rollups.noteCount}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap" title="Resources">
              <span className="text-xs">🔗</span>
              <span>{rollups.resourceCount}</span>
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-2xs text-muted-foreground">
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
            {goal.is_archived ? (
              <>
                <Badge variant="outline">
                  Archived
                </Badge>
                {onRestore && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Restore goal"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(goal);
                    }}
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                )}
                {onDelete && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <DeleteEntityPopover
                      variant="row"
                      entityLabel="goal"
                      entityName={goal.name}
                      disabled={isDeleting}
                      onConfirm={() => onDelete(goal)}
                    />
                  </span>
                )}
              </>
            ) : (
              <>
                {onArchive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Archive goal"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(goal);
                    }}
                  >
                    <Archive className="size-3" />
                  </Button>
                )}
                {onDelete && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <DeleteEntityPopover
                      variant="row"
                      entityLabel="goal"
                      entityName={goal.name}
                      disabled={isDeleting}
                      onConfirm={() => onDelete(goal)}
                    />
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
