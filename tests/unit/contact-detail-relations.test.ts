import { describe, expect, it } from "vitest";

import type { Area, Goal, Project, Task } from "@/lib/types/domain.types";
import {
  buildAreaTabs,
  buildGoalTabs,
  buildProjectTabs,
  buildTaskTabs,
  filterAreasByTab,
  filterGoalsByTab,
  filterProjectsByTab,
  filterTasksByTab,
  resolveLinkedAreas,
  resolveLinkedGoals,
  resolveLinkedProjectsAcrossStatuses,
  resolveLinkedProjects,
  resolveLinkedTasks,
} from "@/lib/utils/contact-detail-relations";

// ── Factories ────────────────────────────────────────────────────────

function makeArea(overrides: Partial<Area> = {}): Area {
  return {
    id: "area-1",
    user_id: "user-1",
    name: "Test Area",
    type: "personal",
    icon: null,
    inactive: false,
    archive: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Area;
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    user_id: "user-1",
    name: "Test Goal",
    term: "short",
    priority: "medium",
    is_completed: false,
    is_archived: false,
    is_inactive: false,
    area_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Goal;
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    user_id: "user-1",
    name: "Test Project",
    status: "planning",
    priority: "medium",
    is_archived: false,
    area_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Project;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    user_id: "user-1",
    name: "Test Task",
    status: "inbox",
    priority: "medium",
    is_completed: false,
    is_archived: false,
    is_focused: false,
    due_date: null,
    area_id: null,
    goal_id: null,
    project_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Task;
}

// ── Resolution helpers ────────────────────────────────────────────────

describe("resolveLinkedAreas", () => {
  it("returns only areas matching link ids", () => {
    const areas = [
      makeArea({ id: "a1", name: "Area 1" }),
      makeArea({ id: "a2", name: "Area 2" }),
      makeArea({ id: "a3", name: "Area 3" }),
    ];
    const result = resolveLinkedAreas(
      [{ area_id: "a1" }, { area_id: "a3" }],
      areas,
    );
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["a1", "a3"]);
  });

  it("returns empty array when no links", () => {
    const areas = [makeArea({ id: "a1" })];
    expect(resolveLinkedAreas([], areas)).toHaveLength(0);
  });
});

describe("resolveLinkedGoals", () => {
  it("returns only goals matching link ids", () => {
    const goals = [
      makeGoal({ id: "g1" }),
      makeGoal({ id: "g2" }),
      makeGoal({ id: "g3" }),
    ];
    const result = resolveLinkedGoals([{ goal_id: "g2" }], goals);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g2");
  });
});

describe("resolveLinkedProjects", () => {
  it("returns only projects matching link ids", () => {
    const projects = [makeProject({ id: "p1" }), makeProject({ id: "p2" })];
    const result = resolveLinkedProjects(
      [{ project_id: "p1" }, { project_id: "p2" }],
      projects,
    );
    expect(result).toHaveLength(2);
  });

  it("keeps linked archived projects when they have moved out of the active query", () => {
    const activeProjects = [makeProject({ id: "p1", is_archived: false })];
    const archivedProjects = [
      makeProject({ id: "p2", is_archived: true, status: "archived" }),
    ];

    const result = resolveLinkedProjectsAcrossStatuses(
      [{ project_id: "p2" }],
      activeProjects,
      archivedProjects,
    );

    expect(result.map((project) => project.id)).toEqual(["p2"]);
    expect(result[0]?.is_archived).toBe(true);
  });
});

describe("resolveLinkedTasks", () => {
  it("returns only tasks matching link ids", () => {
    const tasks = [makeTask({ id: "t1" }), makeTask({ id: "t2" })];
    const result = resolveLinkedTasks([{ task_id: "t2" }], tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t2");
  });
});

// ── Area tabs ─────────────────────────────────────────────────────────

describe("buildAreaTabs", () => {
  it("returns correct tab structure", () => {
    const areas = [
      makeArea({ id: "a1", inactive: false, archive: false }),
      makeArea({ id: "a2", inactive: true, archive: false }),
      makeArea({ id: "a3", inactive: false, archive: true }),
    ];
    const tabs = buildAreaTabs(areas);
    expect(tabs.map((t) => t.value)).toEqual([
      "active",
      "inactive",
      "by_type",
      "all",
      "archived",
    ]);
    expect(tabs.find((t) => t.value === "all")?.count).toBe(3);
    expect(tabs.find((t) => t.value === "active")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "inactive")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "archived")?.count).toBe(1);
  });
});

describe("filterAreasByTab", () => {
  const areas = [
    makeArea({ id: "a1", inactive: false, archive: false }),
    makeArea({ id: "a2", inactive: true, archive: false }),
    makeArea({ id: "a3", inactive: false, archive: true }),
  ];

  it("filters active areas", () => {
    expect(filterAreasByTab(areas, "active").map((a) => a.id)).toEqual(["a1"]);
  });

  it("filters inactive areas", () => {
    expect(filterAreasByTab(areas, "inactive").map((a) => a.id)).toEqual([
      "a2",
    ]);
  });

  it("filters archived areas", () => {
    expect(filterAreasByTab(areas, "archived").map((a) => a.id)).toEqual([
      "a3",
    ]);
  });

  it("returns all areas for 'all' tab", () => {
    expect(filterAreasByTab(areas, "all")).toHaveLength(3);
  });
});

// ── Goal tabs ─────────────────────────────────────────────────────────

describe("buildGoalTabs", () => {
  it("returns correct tab structure", () => {
    const goals = [
      makeGoal({ id: "g1", term: "short", is_completed: false, is_archived: false }),
      makeGoal({ id: "g2", term: "mid", is_completed: false, is_archived: false }),
      makeGoal({ id: "g3", term: "long", is_completed: true, is_archived: false }),
      makeGoal({ id: "g4", term: "short", is_inactive: true }),
      makeGoal({ id: "g5", term: "short", is_archived: true }),
    ];
    const tabs = buildGoalTabs(goals);
    expect(tabs.map((t) => t.value)).toEqual([
      "active",
      "short",
      "mid",
      "long",
      "inactive",
      "completed",
      "archived",
    ]);
    expect(tabs.find((t) => t.value === "active")?.count).toBe(2);
    expect(tabs.find((t) => t.value === "short")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "completed")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "inactive")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "archived")?.count).toBe(1);
  });
});

describe("filterGoalsByTab", () => {
  const goals = [
    makeGoal({ id: "g1", term: "short", is_completed: false, is_archived: false }),
    makeGoal({ id: "g2", term: "mid", is_completed: false, is_archived: false }),
    makeGoal({ id: "g3", term: "long", is_completed: true, is_archived: false }),
    makeGoal({ id: "g4", term: "short", is_inactive: true }),
    makeGoal({ id: "g5", term: "short", is_archived: true }),
  ];

  it("filters active goals", () => {
    expect(filterGoalsByTab(goals, "active").map((g) => g.id)).toEqual([
      "g1",
      "g2",
    ]);
  });

  it("filters by term", () => {
    expect(filterGoalsByTab(goals, "short").map((g) => g.id)).toEqual(["g1"]);
    expect(filterGoalsByTab(goals, "mid").map((g) => g.id)).toEqual(["g2"]);
    expect(filterGoalsByTab(goals, "long").map((g) => g.id)).toEqual([]);
  });

  it("filters completed goals", () => {
    expect(filterGoalsByTab(goals, "completed").map((g) => g.id)).toEqual([
      "g3",
    ]);
  });

  it("filters inactive goals", () => {
    expect(filterGoalsByTab(goals, "inactive").map((g) => g.id)).toEqual([
      "g4",
    ]);
  });

  it("filters archived goals", () => {
    expect(filterGoalsByTab(goals, "archived").map((g) => g.id)).toEqual([
      "g5",
    ]);
  });
});

// ── Project tabs ──────────────────────────────────────────────────────

describe("buildProjectTabs", () => {
  it("returns correct tab structure", () => {
    const projects = [
      makeProject({ id: "p1", status: "planning", is_archived: false }),
      makeProject({ id: "p2", status: "active", is_archived: false }),
      makeProject({ id: "p3", status: "completed", is_archived: false }),
      makeProject({ id: "p4", status: "active", is_archived: true }),
      makeProject({ id: "p5", status: "on_hold", is_archived: false }),
      makeProject({ id: "p6", status: "inbox", is_archived: false }),
    ];
    const tabs = buildProjectTabs(projects);
    expect(tabs.map((t) => t.value)).toEqual([
      "all",
      "inbox",
      "planning",
      "in_progress",
      "on_hold",
      "completed",
      "archived",
    ]);
    expect(tabs.find((t) => t.value === "all")?.count).toBe(5);
    expect(tabs.find((t) => t.value === "inbox")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "planning")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "in_progress")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "on_hold")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "completed")?.count).toBe(1);
    expect(tabs.find((t) => t.value === "archived")?.count).toBe(1);
  });
});

describe("filterProjectsByTab", () => {
  const projects = [
    makeProject({ id: "p1", status: "planning", is_archived: false }),
    makeProject({ id: "p2", status: "active", is_archived: false }),
    makeProject({ id: "p3", status: "completed", is_archived: false }),
    makeProject({ id: "p4", status: "active", is_archived: true }),
    makeProject({ id: "p5", status: "on_hold", is_archived: false }),
    makeProject({ id: "p6", status: "inbox", is_archived: false }),
  ];

  it("filters planning projects", () => {
    expect(filterProjectsByTab(projects, "planning").map((p) => p.id)).toEqual(
      ["p1"],
    );
  });

  it("filters inbox projects", () => {
    expect(filterProjectsByTab(projects, "inbox").map((p) => p.id)).toEqual([
      "p6",
    ]);
  });

  it("filters in_progress projects", () => {
    expect(
      filterProjectsByTab(projects, "in_progress").map((p) => p.id),
    ).toEqual(["p2"]);
  });

  it("filters on_hold projects", () => {
    expect(filterProjectsByTab(projects, "on_hold").map((p) => p.id)).toEqual([
      "p5",
    ]);
  });

  it("filters completed projects", () => {
    expect(
      filterProjectsByTab(projects, "completed").map((p) => p.id),
    ).toEqual(["p3"]);
  });

  it("filters archived projects", () => {
    expect(filterProjectsByTab(projects, "archived").map((p) => p.id)).toEqual(
      ["p4"],
    );
  });

  it("returns non-archived projects for 'all' tab", () => {
    expect(filterProjectsByTab(projects, "all")).toHaveLength(5);
  });
});

// ── Task tabs ─────────────────────────────────────────────────────────

describe("buildTaskTabs", () => {
  it("returns correct tab structure", () => {
    const tabs = buildTaskTabs();
    expect(tabs.map((t) => t.value)).toEqual([
      "all",
      "inbox",
      "upcoming",
      "overdue",
      "by_area",
      "by_goal",
      "by_project",
      "completed",
      "archived",
    ]);
  });
});

describe("filterTasksByTab", () => {
  const tasks = [
    makeTask({ id: "t1", status: "inbox", is_completed: false }),
    makeTask({ id: "t2", status: "in_progress", is_completed: false }),
    makeTask({
      id: "t3",
      status: "in_progress",
      is_completed: false,
      due_date: "2020-01-01",
    }),
    makeTask({ id: "t4", status: "completed", is_completed: true }),
  ];

  it("filters inbox tasks", () => {
    expect(filterTasksByTab(tasks, "inbox").map((t) => t.id)).toEqual(["t1"]);
  });

  it("filters upcoming tasks (non-inbox, non-completed)", () => {
    expect(filterTasksByTab(tasks, "upcoming").map((t) => t.id)).toEqual([
      "t2",
      "t3",
    ]);
  });

  it("filters overdue tasks (past due date, not completed)", () => {
    expect(filterTasksByTab(tasks, "overdue").map((t) => t.id)).toEqual([
      "t3",
    ]);
  });

  it("filters completed tasks", () => {
    expect(filterTasksByTab(tasks, "completed").map((t) => t.id)).toEqual([
      "t4",
    ]);
  });

  it("returns all tasks for 'all' tab", () => {
    expect(filterTasksByTab(tasks, "all")).toHaveLength(4);
  });
});
