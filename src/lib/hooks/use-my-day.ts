import { useMemo } from "react";

import { useTasks } from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";

function todayLocalString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isTaskDueToday(task: Task): boolean {
  if (!task.due_date) return false;
  return task.due_date.slice(0, 10) === todayLocalString();
}

export interface MyDayTasks {
  dueToday: Task[];
  focused: Task[];
}

export function useMyDayTasks(): {
  data: MyDayTasks;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { data: allTasks, isLoading, isError, refetch } = useTasks();

  const data = useMemo<MyDayTasks>(() => {
    const active = (allTasks ?? []).filter((t) => !t.is_archived && !t.is_completed);
    const dueToday = active.filter(isTaskDueToday);
    const dueTodayIds = new Set(dueToday.map((t) => t.id));
    const focused = active.filter((t) => t.is_focused && !dueTodayIds.has(t.id));
    return { dueToday, focused };
  }, [allTasks]);

  return { data, isLoading, isError, refetch };
}

export function useMyDayAvailable(): {
  data: Task[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { data: allTasks, isLoading, isError, refetch } = useTasks();

  const data = useMemo<Task[]>(() => {
    const today = todayLocalString();
    return (allTasks ?? []).filter(
      (t) =>
        !t.is_archived &&
        !t.is_completed &&
        !t.is_focused &&
        t.due_date?.slice(0, 10) !== today,
    );
  }, [allTasks]);

  return { data, isLoading, isError, refetch };
}
