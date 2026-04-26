import { describe, expect, it } from "vitest";

import { PROJECT_STATUS } from "../../src/lib/utils/constants";
import {
  PROJECT_VIEW,
  buildProjectTaskStats,
  getProjectDueState,
  getProjectFiltersForView,
  getProjectViewFromFilters,
  groupProjectsByStatus,
} from "../../src/lib/utils/projects";

const baseProject = {
  area_id: null,
  created_at: "2026-04-24T00:00:00.000Z",
  description: null,
  due_date: null,
  id: "project-1",
  is_archived: false,
  name: "Project",
  priority: "medium",
  progress: 0,
  start_date: null,
  updated_at: "2026-04-24T00:00:00.000Z",
  user_id: "user-1",
} as const;

describe("project view filters", () => {
  it("maps roadmap project tabs to the actual project status model", () => {
    expect(getProjectFiltersForView(PROJECT_VIEW.ALL)).toEqual({ includeArchived: false });
    expect(getProjectFiltersForView(PROJECT_VIEW.INBOX)).toEqual({
      includeArchived: false,
      status: PROJECT_STATUS.PLANNING,
    });
    expect(getProjectFiltersForView(PROJECT_VIEW.IN_PROGRESS)).toEqual({
      includeArchived: false,
      status: PROJECT_STATUS.ACTIVE,
    });
    expect(getProjectFiltersForView(PROJECT_VIEW.ARCHIVE)).toEqual({ includeArchived: true });
  });

  it("derives the correct project tab from persisted filters", () => {
    expect(getProjectViewFromFilters({})).toBe(PROJECT_VIEW.ALL);
    expect(getProjectViewFromFilters({ status: PROJECT_STATUS.PLANNING })).toBe(
      PROJECT_VIEW.INBOX,
    );
    expect(getProjectViewFromFilters({ status: PROJECT_STATUS.ACTIVE })).toBe(
      PROJECT_VIEW.IN_PROGRESS,
    );
    expect(getProjectViewFromFilters({ includeArchived: true })).toBe(PROJECT_VIEW.ARCHIVE);
  });

  it("groups projects by status for the kanban board", () => {
    const grouped = groupProjectsByStatus([
      { ...baseProject, id: "planning", status: PROJECT_STATUS.PLANNING },
      { ...baseProject, id: "active", status: PROJECT_STATUS.ACTIVE },
      { ...baseProject, id: "hold", status: PROJECT_STATUS.ON_HOLD },
    ] as never[]);

    expect(grouped.planning).toHaveLength(1);
    expect(grouped.active).toHaveLength(1);
    expect(grouped.on_hold).toHaveLength(1);
    expect(grouped.completed).toHaveLength(0);
  });

  it("builds task stats and due-date state truthfully", () => {
    const stats = buildProjectTaskStats([
      {
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
        name: "Task A",
        priority: "medium",
        project_id: "project-1",
        smart_priority: 1,
        status: "inbox",
        updated_at: "2026-04-24T00:00:00.000Z",
        user_id: "user-1",
      },
      {
        area_id: null,
        completed_at: "2026-04-24T00:00:00.000Z",
        created_at: "2026-04-24T00:00:00.000Z",
        description: null,
        due_date: null,
        id: "task-2",
        is_archived: false,
        is_completed: true,
        is_focused: false,
        is_important: false,
        is_urgent: false,
        name: "Task B",
        priority: "medium",
        project_id: "project-1",
        smart_priority: 1,
        status: "completed",
        updated_at: "2026-04-24T00:00:00.000Z",
        user_id: "user-1",
      },
    ] as never[]);

    expect(stats.get("project-1")).toEqual({ completed: 1, total: 2 });
    expect(getProjectDueState(null)).toMatchObject({
      label: "No due date",
      tone: "muted",
    });
  });
});
