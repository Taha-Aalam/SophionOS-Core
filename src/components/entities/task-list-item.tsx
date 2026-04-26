"use client";

import React from "react";
import { Archive, Calendar, Folder, Pencil, Star, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

import { PriorityBadge } from "./priority-badge";
import { SmartPriorityBadge } from "./smart-priority-badge";
import { TaskInlineEditor } from "./task-inline-editor";

interface TaskListItemProps {
  task: Task;
  areaName?: string | null;
  projectName?: string | null;
  showSmartPriority?: boolean;
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit?: (task: Task) => void;
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
  const label = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

  return { label, overdue };
}

export function TaskListItem({
  task,
  areaName,
  projectName,
  showSmartPriority = false,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onDelete,
}: TaskListItemProps) {
  const dueInfo = formatDueDate(task.due_date);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30",
        task.is_completed && "opacity-60",
      )}
    >
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={(checked) => onCompletionToggle(task.id, checked === true)}
        className="shrink-0"
      />

      {showSmartPriority ? (
        <SmartPriorityBadge score={task.smart_priority} className="hidden sm:inline-flex" />
      ) : (
        <PriorityBadge priority={task.priority} className="hidden shrink-0 sm:flex" />
      )}

      <div className="min-w-0 flex-1">
        <TaskInlineEditor
          value={task.name}
          onSave={(name) => onNameSave(task.id, name)}
          disabled={task.is_completed}
          completed={task.is_completed}
        />
      </div>

      <div className="hidden shrink-0 items-center gap-2.5 md:flex">
        {areaName && (
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <Tag className="size-3" />
            {areaName}
          </Badge>
        )}
        {projectName && (
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <Folder className="size-3" />
            {projectName}
          </Badge>
        )}
        {dueInfo && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-xs font-normal",
              dueInfo.overdue ? "text-red-500 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            <Calendar className="size-3" />
            {dueInfo.label}
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {onEdit && (
          <button
            onClick={() => onEdit(task)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Edit task"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
            aria-label="Archive task"
          >
            <Archive className="size-3.5" />
          </button>
        )}
      </div>

      <button
        onClick={() => onFocusToggle(task.id, !task.is_focused)}
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          task.is_focused
            ? "text-yellow-500"
            : "text-muted-foreground/20 opacity-0 hover:text-yellow-400 group-hover:opacity-100",
        )}
        aria-label={task.is_focused ? "Remove from focus" : "Add to focus"}
      >
        <Star className={cn("size-4", task.is_focused && "fill-current")} />
      </button>
    </div>
  );
}
