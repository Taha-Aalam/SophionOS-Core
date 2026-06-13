"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import type { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  variant?: "card" | "simple";
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  /** Shared callbacks — passed to every TaskListItem */
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit?: (task: Task) => void;
  onArchiveToggle?: (task: Task) => void;
  onPermanentDelete?: (id: string) => void;
  /** Per-task linked entity props — getters so each task resolves differently */
  getAreaName?: (task: Task) => string | null | undefined;
  getLinkedAreaNames?: (task: Task) => string[];
  getLinkedAreaIcons?: (task: Task) => (string | null)[];
  getGoalName?: (task: Task) => string | null | undefined;
  getLinkedGoalNames?: (task: Task) => string[];
  getProjectName?: (task: Task) => string | null | undefined;
  getLinkedProjectNames?: (task: Task) => string[];
  showSmartPriority?: boolean;
}

export function TaskList({
  tasks,
  variant = "card",
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onArchiveToggle,
  onPermanentDelete,
  getAreaName,
  getLinkedAreaNames,
  getLinkedAreaIcons,
  getGoalName,
  getLinkedGoalNames,
  getProjectName,
  getLinkedProjectNames,
  showSmartPriority,
}: TaskListProps) {
  if (tasks.length === 0) {
    if (!emptyTitle) return null;
    return (
      <EmptyState
        icon={emptyIcon!}
        title={emptyTitle}
        description={emptyDescription ?? ""}
      />
    );
  }

  return (
    <div
      className={cn(
        variant === "card" && "rounded-lg border bg-card",
        variant === "simple" && "divide-y-0",
      )}
    >
      {tasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          areaName={getAreaName?.(task) ?? null}
          linkedAreaNames={getLinkedAreaNames?.(task) ?? []}
          linkedAreaIcons={getLinkedAreaIcons?.(task) ?? []}
          goalName={getGoalName?.(task) ?? null}
          linkedGoalNames={getLinkedGoalNames?.(task) ?? []}
          projectName={getProjectName?.(task) ?? null}
          linkedProjectNames={getLinkedProjectNames?.(task) ?? []}
          showSmartPriority={showSmartPriority}
          onCompletionToggle={onCompletionToggle}
          onFocusToggle={onFocusToggle}
          onNameSave={onNameSave}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onPermanentDelete={onPermanentDelete}
        />
      ))}
    </div>
  );
}
