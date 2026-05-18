"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { CheckSquare } from "lucide-react";
import type { Task } from "@/lib/types/domain.types";

export interface TaskGroup {
  groupId: string;
  groupName: string;
  tasks: Task[];
}

interface TasksByGroupViewProps {
  groups: TaskGroup[];
  areaMap: Map<string, { name: string; icon?: string | null }>;
  goalMap: Map<string, { name: string }>;
  projectMap: Map<string, { name: string }>;
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onNewTask: (groupId: string) => void;
  getLinkedAreaNames: (task: Task) => string[];
  getLinkedAreaIcons: (task: Task) => (string | null)[];
  getLinkedGoalNames: (task: Task) => string[];
  emptyMessage?: string;
}

function CollapsibleTaskGroup({
  group,
  areaMap,
  goalMap: _goalMap,
  projectMap,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onDelete,
  onNewTask,
  getLinkedAreaNames,
  getLinkedAreaIcons,
  getLinkedGoalNames,
}: {
  group: TaskGroup;
  areaMap: Map<string, { name: string; icon?: string | null }>;
  goalMap: Map<string, { name: string }>;
  projectMap: Map<string, { name: string }>;
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onNewTask: (groupId: string) => void;
  getLinkedAreaNames: (task: Task) => string[];
  getLinkedAreaIcons: (task: Task) => (string | null)[];
  getLinkedGoalNames: (task: Task) => string[];
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2 px-1 py-2 group"
      >
        <span className="text-muted-foreground">
          {isOpen ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </span>
        <Badge variant="outline" className="text-xs font-medium">
          {group.groupName}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {isOpen && (
        <div className="rounded-lg border divide-y">
          {group.tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              areaName={task.area_id ? areaMap.get(task.area_id)?.name ?? null : null}
              linkedAreaNames={getLinkedAreaNames(task)}
              linkedAreaIcons={getLinkedAreaIcons(task)}
              linkedGoalNames={getLinkedGoalNames(task)}
              projectName={task.project_id ? projectMap.get(task.project_id)?.name ?? null : null}
              onCompletionToggle={onCompletionToggle}
              onFocusToggle={onFocusToggle}
              onNameSave={onNameSave}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {group.groupId !== "unassigned" && (
            <button
              onClick={() => onNewTask(group.groupId)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="size-4" />
              New task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TasksByGroupView({
  groups,
  areaMap,
  goalMap,
  projectMap,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onDelete,
  onNewTask,
  getLinkedAreaNames,
  getLinkedAreaIcons,
  getLinkedGoalNames,
  emptyMessage = "No tasks in this view.",
}: TasksByGroupViewProps) {
  if (groups.length === 0 || groups.every((g) => g.tasks.length === 0)) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks here"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="px-6 py-4">
      {groups.map((group) => (
        <CollapsibleTaskGroup
          key={group.groupId}
          group={group}
          areaMap={areaMap}
          goalMap={goalMap}
          projectMap={projectMap}
          onCompletionToggle={onCompletionToggle}
          onFocusToggle={onFocusToggle}
          onNameSave={onNameSave}
          onEdit={onEdit}
          onDelete={onDelete}
          onNewTask={onNewTask}
          getLinkedAreaNames={getLinkedAreaNames}
          getLinkedAreaIcons={getLinkedAreaIcons}
          getLinkedGoalNames={getLinkedGoalNames}
        />
      ))}
    </div>
  );
}