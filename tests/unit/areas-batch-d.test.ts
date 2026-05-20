import { describe, expect, it } from "vitest";

import {
  classifyAreaStatus,
  getAreaProgress,
  getAreaRollups,
  groupAreasByType,
  normalizeAreaType,
} from "@/lib/utils/areas";
import type { Area, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";

function createArea(overrides: Partial<Area>): Area {
  return {
    archive: false,
    color: null,
    created_at: new Date().toISOString(),
    description: null,
    icon: null,
    id: crypto.randomUUID(),
    inactive: false,
    metadata: {},
    name: "Area",
    slug: "area",
    type: "Personal",
    updated_at: new Date().toISOString(),
    user_id: "user-1",
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g-1", user_id: "u", name: "G", description: null, progress: 0,
    term: "short", priority: "medium", area_id: "area-1",
    is_completed: false, is_archived: false,
    target_date: null, slug: "g",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  } as Goal;
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p-1", user_id: "u", name: "P", description: null,
    status: "active", priority: "medium", area_id: "area-1",
    progress: 0, is_archived: false,
    start_date: null, due_date: null, slug: "p",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  } as unknown as Project;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t-1", user_id: "u", name: "T", status: "inbox",
    is_completed: false, is_archived: false, priority: "medium",
    due_date: null, project_id: null, linkedGoalIds: [], area_id: "area-1",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  } as Task;
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n-1", user_id: "u", name: "N", content: null, type: "note",
    status: "inbox", area_id: "area-1", is_archived: false,
    slug: "n", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  } as Note;
}

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "r-1", user_id: "u", name: "R", url: null, type: "website",
    status: "inbox", area_id: "area-1", is_archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  } as unknown as Resource;
}

describe("areas Batch D helpers", () => {
  it("normalizes stored and display area types into a single canonical title case", () => {
    expect(normalizeAreaType("business")).toBe("Business");
    expect(normalizeAreaType("  sTuDiEs ")).toBe("Studies");
    expect(normalizeAreaType("")).toBe("Personal");
    expect(normalizeAreaType(null)).toBe("Personal");
  });

  it("groups non-archived areas by normalized type and preserves inactive areas in the type view", () => {
    const groupedAreas = groupAreasByType([
      createArea({ id: "1", name: "Work", type: "business" }),
      createArea({ id: "2", name: "Health", type: "Personal", inactive: true }),
      createArea({ id: "3", name: "Study Plan", type: " studies " }),
      createArea({ id: "4", name: "Hidden", type: "Business", archive: true }),
    ]);

    expect(groupedAreas).toEqual([
      {
        type: "Business",
        areas: [expect.objectContaining({ id: "1", name: "Work" })],
      },
      {
        type: "Personal",
        areas: [expect.objectContaining({ id: "2", name: "Health", inactive: true })],
      },
      {
        type: "Studies",
        areas: [expect.objectContaining({ id: "3", name: "Study Plan" })],
      },
    ]);
  });

  it("keeps archived areas separate from inactive areas so restore returns to the correct tab", () => {
    expect(classifyAreaStatus(createArea({ archive: false, inactive: false }))).toBe("active");
    expect(classifyAreaStatus(createArea({ archive: false, inactive: true }))).toBe("inactive");
    expect(classifyAreaStatus(createArea({ archive: true, inactive: false }))).toBe("archived");
    expect(classifyAreaStatus(createArea({ archive: true, inactive: true }))).toBe("archived");
  });

  it("moves an area between grouped sections after a type edit", () => {
    const area = createArea({ id: "area-1", name: "Career", type: "Personal" });

    const beforeEdit = groupAreasByType([area]);
    const afterEdit = groupAreasByType([{ ...area, type: "Business" }]);

    expect(beforeEdit).toEqual([
      {
        type: "Personal",
        areas: [expect.objectContaining({ id: "area-1" })],
      },
    ]);
    expect(afterEdit).toEqual([
      {
        type: "Business",
        areas: [expect.objectContaining({ id: "area-1" })],
      },
    ]);
  });
});

describe("getAreaRollups", () => {
  const AREA_ID = "area-1";

  it("excludes completed goals from goalsCount", () => {
    const goals = [makeGoal({ is_completed: false }), makeGoal({ id: "g-2", is_completed: true })];
    const { goalsCount } = getAreaRollups({ areaId: AREA_ID, goals, projects: [], tasks: [], notes: [], resources: [] });
    expect(goalsCount).toBe(1);
  });

  it("excludes archived goals from goalsCount", () => {
    const goals = [makeGoal({ is_archived: false }), makeGoal({ id: "g-2", is_archived: true })];
    const { goalsCount } = getAreaRollups({ areaId: AREA_ID, goals, projects: [], tasks: [], notes: [], resources: [] });
    expect(goalsCount).toBe(1);
  });

  it("excludes completed projects from projectsCount", () => {
    const projects = [makeProject({ status: "active" }), makeProject({ id: "p-2", status: "completed" })];
    const { projectsCount } = getAreaRollups({ areaId: AREA_ID, goals: [], projects, tasks: [], notes: [], resources: [] });
    expect(projectsCount).toBe(1);
  });

  it("excludes archived projects from projectsCount", () => {
    const projects = [makeProject({ is_archived: false }), makeProject({ id: "p-2", is_archived: true })];
    const { projectsCount } = getAreaRollups({ areaId: AREA_ID, goals: [], projects, tasks: [], notes: [], resources: [] });
    expect(projectsCount).toBe(1);
  });

  it("excludes completed tasks from tasksCount", () => {
    const tasks = [makeTask({ is_completed: false }), makeTask({ id: "t-2", is_completed: true })];
    const { tasksCount } = getAreaRollups({ areaId: AREA_ID, goals: [], projects: [], tasks, notes: [], resources: [] });
    expect(tasksCount).toBe(1);
  });

  it("counts only inbox/to_review/active notes (not saved or archived)", () => {
    const notes = [
      makeNote({ id: "n-inbox", status: "inbox" }),
      makeNote({ id: "n-review", status: "to_review" }),
      makeNote({ id: "n-active", status: "active" }),
      makeNote({ id: "n-saved", status: "saved" }),
      makeNote({ id: "n-archive", status: "archive" }),
      makeNote({ id: "n-is-arch", is_archived: true }),
    ];
    const { notesCount } = getAreaRollups({ areaId: AREA_ID, goals: [], projects: [], tasks: [], notes, resources: [] });
    expect(notesCount).toBe(3);
  });

  it("counts only inbox/to_review/active resources (not saved or archived)", () => {
    const resources = [
      makeResource({ id: "r-inbox", status: "inbox" }),
      makeResource({ id: "r-review", status: "to_review" }),
      makeResource({ id: "r-active", status: "active" }),
      makeResource({ id: "r-saved", status: "saved" }),
      makeResource({ id: "r-is-arch", is_archived: true }),
    ];
    const { resourcesCount } = getAreaRollups({ areaId: AREA_ID, goals: [], projects: [], tasks: [], notes: [], resources });
    expect(resourcesCount).toBe(3);
  });
});

describe("getAreaProgress", () => {
  const AREA_ID = "area-1";

  it("returns 0 percentage when no items linked", () => {
    const result = getAreaProgress({ areaId: AREA_ID, goals: [], projects: [], tasks: [], notes: [], resources: [] });
    expect(result).toEqual({ completed: 0, total: 0, percentage: 0 });
  });

  it("counts completed goals (is_completed) towards completed, excludes archived from total", () => {
    const goals = [
      makeGoal({ id: "g-active", is_completed: false }),
      makeGoal({ id: "g-done", is_completed: true }),
      makeGoal({ id: "g-arch", is_archived: true }),
    ];
    const result = getAreaProgress({ areaId: AREA_ID, goals, projects: [], tasks: [], notes: [], resources: [] });
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("counts completed projects (status=completed) towards completed", () => {
    const projects = [
      makeProject({ id: "p-active", status: "active" }),
      makeProject({ id: "p-done", status: "completed" }),
    ];
    const result = getAreaProgress({ areaId: AREA_ID, goals: [], projects, tasks: [], notes: [], resources: [] });
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("counts saved notes towards completed; excludes is_archived and status=archive from total", () => {
    const notes = [
      makeNote({ id: "n-inbox", status: "inbox" }),
      makeNote({ id: "n-saved", status: "saved" }),
      makeNote({ id: "n-arch-status", status: "archive" }),
      makeNote({ id: "n-is-arch", is_archived: true }),
    ];
    const result = getAreaProgress({ areaId: AREA_ID, goals: [], projects: [], tasks: [], notes, resources: [] });
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
  });

  it("counts saved resources towards completed", () => {
    const resources = [
      makeResource({ id: "r-inbox", status: "inbox" }),
      makeResource({ id: "r-saved", status: "saved" }),
    ];
    const result = getAreaProgress({ areaId: AREA_ID, goals: [], projects: [], tasks: [], notes: [], resources });
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("returns 100 percentage when all items completed", () => {
    const goals = [makeGoal({ is_completed: true })];
    const tasks = [makeTask({ is_completed: true })];
    const result = getAreaProgress({ areaId: AREA_ID, goals, projects: [], tasks, notes: [], resources: [] });
    expect(result.percentage).toBe(100);
  });
});
