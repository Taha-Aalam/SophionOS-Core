"use client";

import React, { memo } from "react";
import { Calendar, Map, Pencil, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

import { DeleteEntityPopover } from "./delete-entity-popover";
import { PriorityBadge } from "./priority-badge";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import { SmartPriorityBadge } from "./smart-priority-badge";
import { TaskArchiveToggle } from "./task-archive-toggle";
import { TaskInlineEditor } from "./task-inline-editor";
import { useClickableProps } from "@/components/ui/clickable";

interface TaskListItemProps {
  task: Task;
  areaName?: string | null;
  linkedAreaNames?: string[];
  linkedAreaIcons?: (string | null)[];
  goalName?: string | null;
  linkedGoalNames?: string[];
  projectName?: string | null;
  linkedProjectNames?: string[];
  showSmartPriority?: boolean;
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit?: (task: Task) => void;
  onArchiveToggle?: (task: Task) => void;
  onPermanentDelete?: (id: string) => void;
  /** @deprecated Use `onArchiveToggle` instead. Kept as transitional alias. */
  onDelete?: (id: string) => void;
}

function formatDueDate(dateStr: string | null): { label: string; overdue: boolean } | null {
  if (!dateStr) {
    return null;
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const overdue = dateDay < today;
  const label = formatDate(date);

  return { label, overdue };
}

export function TaskListItemComponent({
  task,
  areaName,
  linkedAreaNames,
  linkedAreaIcons,
  goalName,
  linkedGoalNames,
  projectName,
  linkedProjectNames,
  showSmartPriority = false,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onArchiveToggle,
  onPermanentDelete,
  onDelete,
}: TaskListItemProps) {
  const displayAreaNames = linkedAreaNames && linkedAreaNames.length > 0 ? linkedAreaNames : (areaName ? [areaName] : []);
  const displayGoalNames = linkedGoalNames && linkedGoalNames.length > 0 ? linkedGoalNames : (goalName ? [goalName] : []);
  const displayProjectNames = linkedProjectNames && linkedProjectNames.length > 0 ? linkedProjectNames : (projectName ? [projectName] : []);
  const dueInfo = formatDueDate(task.due_date);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30",
        task.is_completed && "opacity-60",
      )}
      onClick={() => onEdit?.(task)}
      {...(onEdit ? useClickableProps(() => onEdit(task)) : {})}
    >
      <span onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={(checked) => onCompletionToggle(task.id, checked === true)}
          className="shrink-0"
        />
      </span>

      <StatusBadge status={task.status} className="hidden shrink-0 sm:inline-flex" />

      {showSmartPriority ? (
        <SmartPriorityBadge score={task.smart_priority} className="hidden sm:inline-flex" />
      ) : (
        <PriorityBadge priority={task.priority} className="hidden shrink-0 sm:flex" />
      )}

      <div className="min-w-0 flex-1">
        {onEdit ? (
          <span
            className={cn(
              "text-sm leading-tight break-words",
              task.is_completed ? "line-through text-muted-foreground" : "cursor-pointer hover:text-foreground/80",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
          >
            {task.name}
          </span>
        ) : (
          <TaskInlineEditor
            value={task.name}
            onSave={(name) => onNameSave(task.id, name)}
            disabled={task.is_completed}
            completed={task.is_completed}
          />
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {displayAreaNames.slice(0, 2).map((name, index) => (
          <Badge key={`area-${index}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            {linkedAreaIcons?.[index] ? (
              <span className="text-2xs leading-none">{linkedAreaIcons[index]}</span>
            ) : (
              <Map className="size-2.5" />
            )}
            {name}
          </Badge>
        ))}
        {displayAreaNames.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{displayAreaNames.length - 2}
          </Badge>
        )}
        {displayGoalNames.slice(0, 2).map((name, index) => (
          <Badge key={`goal-${index}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            <span className="text-2xs leading-none">🎯</span>
            {name}
          </Badge>
        ))}
        {displayGoalNames.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{displayGoalNames.length - 2}
          </Badge>
        )}
        {displayProjectNames.slice(0, 2).map((name, index) => (
          <Badge key={`project-${index}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            <span className="text-2xs leading-none">📁</span>
            {name}
          </Badge>
        ))}
        {displayProjectNames.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{displayProjectNames.length - 2}
          </Badge>
        )}
        {dueInfo && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-2xs leading-none font-normal",
              dueInfo.overdue ? "text-red-500 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            <Calendar className="size-2.5" />
            {dueInfo.label}
          </Badge>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onFocusToggle(task.id, !task.is_focused);
        }}
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          task.is_focused
            ? "text-yellow-500"
            : "text-muted-foreground/20 opacity-0 hover:text-yellow-400 group-hover:opacity-100",
        )}
        aria-label={task.is_focused ? "Remove from focus" : "Add to focus"}
      >
        <Star className={cn("size-3.5", task.is_focused && "fill-current")} />
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Edit task"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        {(onArchiveToggle || onDelete) && (
          <span onClick={(e) => e.stopPropagation()}>
            <TaskArchiveToggle
              isArchived={task.is_archived}
              mode="row"
              onClick={() => {
                if (onArchiveToggle) {
                  onArchiveToggle(task);
                } else {
                  onDelete!(task.id);
                }
              }}
            />
          </span>
        )}
        {onPermanentDelete && (
          <span onClick={(e) => e.stopPropagation()}>
            <DeleteEntityPopover
              variant="row"
              entityLabel="task"
              entityName={task.name}
              requireTypedConfirmation={false}
              onConfirm={() => onPermanentDelete(task.id)}
            />
          </span>
        )}
      </div>
    </div>
  );
}

// React.memo so re-renders of the parent (filter change, dialog open, etc.)
// don't cascade to every row. Parent passes stable callback refs via
// useCallback; default shallow equality is sufficient — a task prop reference
// change means the row's data actually changed.
export const TaskListItem = memo(TaskListItemComponent);
