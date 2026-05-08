import type { Task } from "@/lib/types/domain.types";
import { TASK_STATUS, type TaskStatus } from "@/lib/utils/constants";

export const TASK_VIEW = {
  ALL: "all",
  INBOX: "inbox",
  UPCOMING: "upcoming",
  OVERDUE: "overdue",
  COMPLETED: "completed",
  FOCUS: "focus",
  SMART_PRIORITY: "smart",
  CALENDAR: "calendar",
} as const;

export type TaskView = (typeof TASK_VIEW)[keyof typeof TASK_VIEW];
export type TaskTimingFilter = "overdue" | "upcoming";

export interface TaskViewFilters {
  completedOnly?: boolean;
  focusOnly?: boolean;
  includeArchived: boolean;
  includeCompleted: boolean;
  sortBy?: "smart_priority";
  status?: TaskStatus;
  timing?: TaskTimingFilter;
}

export interface TaskCounts {
  all: number;
  calendar: number;
  completed: number;
  focus: number;
  inbox: number;
  overdue: number;
  smartPriority: number;
  upcoming: number;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isTaskOverdue(task: Task, today: Date = startOfToday()): boolean {
  if (task.is_archived || task.is_completed || !task.due_date) {
    return false;
  }

  return parseDateOnly(task.due_date).getTime() < today.getTime();
}

export function isTaskUpcoming(task: Task, today: Date = startOfToday()): boolean {
  if (task.is_archived || task.is_completed || !task.due_date) {
    return false;
  }

  return parseDateOnly(task.due_date).getTime() >= today.getTime();
}

export function getTaskFiltersForView(view: TaskView): TaskViewFilters {
  switch (view) {
    case TASK_VIEW.INBOX:
      return { includeArchived: false, includeCompleted: false, status: TASK_STATUS.INBOX };
    case TASK_VIEW.UPCOMING:
      return { includeArchived: false, includeCompleted: false, timing: "upcoming" };
    case TASK_VIEW.OVERDUE:
      return { includeArchived: false, includeCompleted: false, timing: "overdue" };
    case TASK_VIEW.COMPLETED:
      return { includeArchived: false, includeCompleted: true, completedOnly: true };
    case TASK_VIEW.FOCUS:
      return { includeArchived: false, includeCompleted: false, focusOnly: true };
    case TASK_VIEW.SMART_PRIORITY:
      return { includeArchived: false, includeCompleted: false, sortBy: "smart_priority" };
    case TASK_VIEW.CALENDAR:
      return { includeArchived: false, includeCompleted: false, timing: "upcoming" };
    case TASK_VIEW.ALL:
    default:
      return { includeArchived: false, includeCompleted: true };
  }
}

export function getTaskViewFromFilters(filters: TaskViewFilters): TaskView {
  if (filters.completedOnly) {
    return TASK_VIEW.COMPLETED;
  }

  if (filters.focusOnly) {
    return TASK_VIEW.FOCUS;
  }

  if (filters.status === TASK_STATUS.INBOX) {
    return TASK_VIEW.INBOX;
  }

  if (filters.timing === "overdue") {
    return TASK_VIEW.OVERDUE;
  }

  if (filters.sortBy === "smart_priority") {
    return TASK_VIEW.SMART_PRIORITY;
  }

  return TASK_VIEW.ALL;
}

export function getVisibleTasks(tasks: Task[], view: TaskView): Task[] {
  const today = startOfToday();
  const filters = getTaskFiltersForView(view);
  let visibleTasks = tasks.filter((task) => {
    if (!filters.includeArchived && task.is_archived) {
      return false;
    }

    if (!filters.includeCompleted && task.is_completed) {
      return false;
    }

    if (filters.completedOnly) {
      return task.is_completed && !task.is_archived;
    }

    if (filters.focusOnly) {
      return task.is_focused && !task.is_completed && !task.is_archived;
    }

    if (filters.status) {
      return task.status === filters.status && !task.is_completed && !task.is_archived;
    }

    if (view === TASK_VIEW.CALENDAR) {
      return Boolean(task.due_date && !task.is_completed && !task.is_archived);
    }

    if (filters.timing === "overdue") {
      return isTaskOverdue(task, today);
    }

    if (filters.timing === "upcoming") {
      return isTaskUpcoming(task, today);
    }

    return true;
  });

  if (filters.sortBy === "smart_priority") {
    visibleTasks = [...visibleTasks].sort((left, right) => {
      if (right.smart_priority !== left.smart_priority) {
        return right.smart_priority - left.smart_priority;
      }

      if (!left.due_date && !right.due_date) {
        return left.name.localeCompare(right.name);
      }

      if (!left.due_date) {
        return 1;
      }

      if (!right.due_date) {
        return -1;
      }

      return parseDateOnly(left.due_date).getTime() - parseDateOnly(right.due_date).getTime();
    });
  }

  return visibleTasks;
}

export function getTaskLinkedAreaIds(task: Task): string[] {
  if (task.linkedAreaIds && task.linkedAreaIds.length > 0) {
    return task.linkedAreaIds;
  }
  return task.area_id ? [task.area_id] : [];
}

export function taskMatchesAreaId(task: Task, areaId: string): boolean {
  return getTaskLinkedAreaIds(task).includes(areaId);
}

export function getTaskLinkedGoalIds(task: Task): string[] {
  return task.linkedGoalIds ?? [];
}

export function taskMatchesGoalId(task: Task, goalId: string): boolean {
  return getTaskLinkedGoalIds(task).includes(goalId);
}

export function getTaskCounts(tasks: Task[]): TaskCounts {
  return {
    all: tasks.filter((task) => !task.is_archived).length,
    calendar: getVisibleTasks(tasks, TASK_VIEW.CALENDAR).length,
    completed: getVisibleTasks(tasks, TASK_VIEW.COMPLETED).length,
    focus: getVisibleTasks(tasks, TASK_VIEW.FOCUS).length,
    inbox: getVisibleTasks(tasks, TASK_VIEW.INBOX).length,
    overdue: getVisibleTasks(tasks, TASK_VIEW.OVERDUE).length,
    smartPriority: getVisibleTasks(tasks, TASK_VIEW.SMART_PRIORITY).length,
    upcoming: getVisibleTasks(tasks, TASK_VIEW.UPCOMING).length,
  };
}
