"use client";

import { useCompleteTask, useFocusTask, useUpdateTask } from "@/lib/hooks/use-tasks";
import { TaskListItem } from "@/components/entities/task-list-item";
import type { TodayData } from "@/lib/services/dashboard.service";
import type { Task } from "@/lib/types/domain.types";

interface TodayTasksListProps {
  tasks: TodayData["todayTasks"];
}

export function TodayTasksList({ tasks }: TodayTasksListProps) {
  const completeTask = useCompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Nothing due today. Enjoy the breathing room!
        </p>
      </div>
    );
  }

  // Sort: overdue first, then by due date, then by priority
  const sorted = [...tasks].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
  });

  return (
    <div className="space-y-2">
      {sorted.map((task) => (
        <TaskListItem
          key={task.id}
          task={
            {
              id: task.id,
              name: task.title,
              description: task.description,
              due_date: task.dueDate,
              priority: task.priority as "low" | "medium" | "high",
              status: task.status as "completed" | "inbox" | "todo" | "in_progress" | "archived",
              is_completed: false,
              is_focused: false,
              completed_at: null,
              created_at: "",
              updated_at: "",
              user_id: "",
              project_id: task.projectId,
              area_id: task.areaId,
              is_important: false,
              is_urgent: false,
              smart_priority: 0,
              is_archived: false,
            } as Task
          }
          projectName={task.projectName ?? undefined}
          areaName={task.areaName ?? undefined}
          onCompletionToggle={(id) => completeTask.mutate(id)}
          onFocusToggle={(id, isFocused) => focusTask.mutate({ id, is_focused: isFocused })}
          onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
        />
      ))}
    </div>
  );
}