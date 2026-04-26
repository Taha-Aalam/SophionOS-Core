import { describe, expect, it } from "vitest";

import { TASK_STATUS } from "../../src/lib/utils/constants";
import {
  TASK_VIEW,
  getTaskCounts,
  getTaskFiltersForView,
  getTaskViewFromFilters,
  getVisibleTasks,
} from "../../src/lib/utils/tasks";

const baseTask = {
  area_id: null,
  completed_at: null,
  created_at: "2026-04-24T00:00:00.000Z",
  description: null,
  due_date: null,
  id: "task-1",
  is_archived: false,
  is_completed: false,
  is_focused: false,
  is_important: false,
  is_urgent: false,
  name: "Task",
  priority: "medium",
  project_id: null,
  smart_priority: 1,
  status: TASK_STATUS.INBOX,
  updated_at: "2026-04-24T00:00:00.000Z",
  user_id: "user-1",
} as const;

function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split("T")[0];
}

describe("task view filters", () => {
  it("maps roadmap tabs to the task filter model", () => {
    expect(getTaskFiltersForView(TASK_VIEW.ALL)).toEqual({
      includeArchived: false,
      includeCompleted: true,
    });
    expect(getTaskFiltersForView(TASK_VIEW.INBOX)).toEqual({
      includeArchived: false,
      includeCompleted: false,
      status: TASK_STATUS.INBOX,
    });
    expect(getTaskFiltersForView(TASK_VIEW.OVERDUE)).toEqual({
      includeArchived: false,
      includeCompleted: false,
      timing: "overdue",
    });
    expect(getTaskFiltersForView(TASK_VIEW.COMPLETED)).toEqual({
      includeArchived: false,
      includeCompleted: true,
      completedOnly: true,
    });
    expect(getTaskFiltersForView(TASK_VIEW.SMART_PRIORITY)).toEqual({
      includeArchived: false,
      includeCompleted: false,
      sortBy: "smart_priority",
    });
  });

  it("derives the active task tab from persisted filters", () => {
    expect(getTaskViewFromFilters({ includeArchived: false, includeCompleted: true })).toBe(
      TASK_VIEW.ALL,
    );
    expect(
      getTaskViewFromFilters({
        includeArchived: false,
        includeCompleted: false,
        status: TASK_STATUS.INBOX,
      }),
    ).toBe(TASK_VIEW.INBOX);
    expect(
      getTaskViewFromFilters({ includeArchived: false, includeCompleted: false, focusOnly: true }),
    ).toBe(TASK_VIEW.FOCUS);
    expect(
      getTaskViewFromFilters({
        includeArchived: false,
        includeCompleted: false,
        sortBy: "smart_priority",
      }),
    ).toBe(TASK_VIEW.SMART_PRIORITY);
  });

  it("builds counts and visible tasks truthfully for the roadmap views", () => {
    const tasks = [
      { ...baseTask, id: "inbox", status: TASK_STATUS.INBOX },
      {
        ...baseTask,
        id: "upcoming",
        due_date: futureDate(2),
        status: TASK_STATUS.TODO,
      },
      {
        ...baseTask,
        id: "overdue",
        due_date: "2020-01-01",
        status: TASK_STATUS.TODO,
      },
      {
        ...baseTask,
        id: "completed",
        completed_at: "2026-04-24T00:00:00.000Z",
        is_completed: true,
        status: TASK_STATUS.COMPLETED,
      },
      {
        ...baseTask,
        id: "focus",
        is_focused: true,
        status: TASK_STATUS.IN_PROGRESS,
      },
      {
        ...baseTask,
        id: "smart-high",
        smart_priority: 5,
        status: TASK_STATUS.TODO,
      },
      {
        ...baseTask,
        id: "archived",
        is_archived: true,
        status: TASK_STATUS.ARCHIVED,
      },
    ] as never[];

    expect(getTaskCounts(tasks)).toMatchObject({
      all: 6,
      inbox: 1,
      upcoming: 1,
      overdue: 1,
      completed: 1,
      focus: 1,
      smartPriority: 5,
      calendar: 2,
    });
    expect(getVisibleTasks(tasks, TASK_VIEW.OVERDUE).map((task) => task.id)).toEqual(["overdue"]);
    expect(getVisibleTasks(tasks, TASK_VIEW.COMPLETED).map((task) => task.id)).toEqual([
      "completed",
    ]);
    expect(getVisibleTasks(tasks, TASK_VIEW.SMART_PRIORITY).map((task) => task.id)[0]).toBe(
      "smart-high",
    );
    expect(getVisibleTasks(tasks, TASK_VIEW.CALENDAR).map((task) => task.id)).toEqual([
      "upcoming",
      "overdue",
    ]);
  });
});
