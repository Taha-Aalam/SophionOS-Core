// src/lib/__tests__/contact-relationship-filters.test.ts
import { describe, expect, it } from "vitest";
import {
  filterAreas,
  filterProjects,
  filterGoals,
  filterTasks,
  buildGoalProjectMaps,
  buildGoalTaskMaps,
  cleanInvalidSelections,
  type AreaEntity,
  type GoalEntity,
  type ProjectEntity,
  type TaskEntity,
} from "@/lib/utils/contact-relationship-filters";

// ── helpers ──────────────────────────────────────────────────────────────────

function area(id: string, name = id): AreaEntity {
  return { id, name };
}

function project(
  id: string,
  opts: { area_id?: string | null; linkedAreaIds?: string[]; name?: string } = {},
): ProjectEntity {
  return { id, name: opts.name ?? id, area_id: null, linkedAreaIds: [], ...opts };
}

function goal(
  id: string,
  opts: { area_id?: string | null; linkedAreaIds?: string[]; name?: string } = {},
): GoalEntity {
  return { id, name: opts.name ?? id, area_id: null, linkedAreaIds: [], ...opts };
}

function task(
  id: string,
  opts: { area_id?: string | null; linkedAreaIds?: string[]; project_id?: string | null; name?: string } = {},
): TaskEntity {
  return { id, name: opts.name ?? id, area_id: null, linkedAreaIds: [], project_id: null, ...opts };
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const A1 = area("area-1");
const A2 = area("area-2");
const A3 = area("area-3");
const ALL_AREAS = [A1, A2, A3];

const P1 = project("proj-1", { area_id: "area-1" });
const P2 = project("proj-2", { area_id: "area-2" });
const P3 = project("proj-3", { linkedAreaIds: ["area-1"] });
const ALL_PROJECTS = [P1, P2, P3];

const G1 = goal("goal-1", { area_id: "area-1" });
const G2 = goal("goal-2", { area_id: "area-2" });
const G3 = goal("goal-3", { linkedAreaIds: ["area-1"] });
const ALL_GOALS = [G1, G2, G3];

const T1 = task("task-1", { area_id: "area-1", project_id: "proj-1" });
const T2 = task("task-2", { area_id: "area-2", project_id: "proj-2" });
const T3 = task("task-3", { linkedAreaIds: ["area-1"], project_id: "proj-3" });
const T4 = task("task-4", { area_id: "area-1", project_id: "proj-1" }); // no direct goal link
const ALL_TASKS = [T1, T2, T3, T4];

// Relation maps
const { goalToProjectIds, projectToGoalIds } = buildGoalProjectMaps([
  { goal_id: "goal-1", project_id: "proj-1" },
  { goal_id: "goal-2", project_id: "proj-2" },
]);
const { goalToTaskIds, taskToGoalIds } = buildGoalTaskMaps([
  { goal_id: "goal-1", task_id: "task-1" },
  { goal_id: "goal-2", task_id: "task-2" },
]);

// ── filterAreas ──────────────────────────────────────────────────────────────

describe("filterAreas", () => {
  const base = { allAreas: ALL_AREAS, selectedAreaIds: [], selectedGoalIds: [], selectedProjectIds: [], selectedTaskIds: [] };

  it("returns all active areas when no constraints", () => {
    expect(filterAreas({ ...base, selectedTasks: [], selectedGoals: [], selectedProjects: [] })).toEqual(ALL_AREAS);
  });

  it("filters by projects only", () => {
    expect(filterAreas({ ...base, selectedProjectIds: ["proj-1"], selectedTasks: [], selectedGoals: [], selectedProjects: [P1] })).toEqual([A1]);
  });

  it("filters by goals only", () => {
    expect(filterAreas({ ...base, selectedGoalIds: ["goal-1"], selectedTasks: [], selectedGoals: [G1], selectedProjects: [] })).toEqual([A1]);
  });

  it("filters by tasks only", () => {
    expect(filterAreas({ ...base, selectedTaskIds: ["task-1"], selectedTasks: [T1], selectedGoals: [], selectedProjects: [] })).toEqual([A1]);
  });

  it("intersects projects + goals", () => {
    // P1 → area-1; G2 → area-2; intersection = empty
    expect(filterAreas({ ...base, selectedProjectIds: ["proj-1"], selectedGoalIds: ["goal-2"], selectedTasks: [], selectedGoals: [G2], selectedProjects: [P1] })).toEqual([]);
    // P1 → area-1; G1 → area-1; intersection = area-1
    expect(filterAreas({ ...base, selectedProjectIds: ["proj-1"], selectedGoalIds: ["goal-1"], selectedTasks: [], selectedGoals: [G1], selectedProjects: [P1] })).toEqual([A1]);
  });

  it("intersects projects + tasks", () => {
    // P1 → area-1; T2 → area-2; intersection = empty
    expect(filterAreas({ ...base, selectedProjectIds: ["proj-1"], selectedTaskIds: ["task-2"], selectedTasks: [T2], selectedGoals: [], selectedProjects: [P1] })).toEqual([]);
  });

  it("intersects goals + tasks", () => {
    // G1 → area-1; T2 → area-2; intersection = empty
    expect(filterAreas({ ...base, selectedGoalIds: ["goal-1"], selectedTaskIds: ["task-2"], selectedTasks: [T2], selectedGoals: [G1], selectedProjects: [] })).toEqual([]);
  });

  it("intersects all three", () => {
    // P1 → area-1; G1 → area-1; T1 → area-1; all match
    expect(filterAreas({ ...base, selectedProjectIds: ["proj-1"], selectedGoalIds: ["goal-1"], selectedTaskIds: ["task-1"], selectedTasks: [T1], selectedGoals: [G1], selectedProjects: [P1] })).toEqual([A1]);
  });
});

// ── filterProjects ───────────────────────────────────────────────────────────

describe("filterProjects", () => {
  const base = { allProjects: ALL_PROJECTS, selectedAreaIds: [], selectedGoalIds: [], selectedProjectIds: [], selectedTaskIds: [] };

  it("returns all active projects when no constraints", () => {
    expect(filterProjects({ ...base, selectedTasks: [], goalToProjectIds })).toEqual(ALL_PROJECTS);
  });

  it("filters by areas only", () => {
    expect(filterProjects({ ...base, selectedAreaIds: ["area-1"], selectedTasks: [], goalToProjectIds })).toEqual([P1, P3]);
  });

  it("filters by goals only", () => {
    expect(filterProjects({ ...base, selectedGoalIds: ["goal-1"], selectedTasks: [], goalToProjectIds })).toEqual([P1]);
  });

  it("filters by tasks only", () => {
    expect(filterProjects({ ...base, selectedTaskIds: ["task-1"], selectedTasks: [T1], goalToProjectIds })).toEqual([P1]);
  });

  it("intersects areas + goals", () => {
    // area-1 → P1, P3; goal-2 → P2; intersection = empty
    expect(filterProjects({ ...base, selectedAreaIds: ["area-1"], selectedGoalIds: ["goal-2"], selectedTasks: [], goalToProjectIds })).toEqual([]);
  });

  it("intersects areas + tasks", () => {
    // area-1 → P1, P3; T2 (proj-2) → P2; intersection = empty
    expect(filterProjects({ ...base, selectedAreaIds: ["area-1"], selectedTaskIds: ["task-2"], selectedTasks: [T2], goalToProjectIds })).toEqual([]);
  });

  it("intersects goals + tasks", () => {
    // goal-1 → P1; T2 (proj-2) → P2; intersection = empty
    expect(filterProjects({ ...base, selectedGoalIds: ["goal-1"], selectedTaskIds: ["task-2"], selectedTasks: [T2], goalToProjectIds })).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → P1, P3; goal-1 → P1; T1 (proj-1) → P1
    expect(filterProjects({ ...base, selectedAreaIds: ["area-1"], selectedGoalIds: ["goal-1"], selectedTaskIds: ["task-1"], selectedTasks: [T1], goalToProjectIds })).toEqual([P1]);
  });

  it("goal with no linked projects → constraint inactive → shows all projects", () => {
    // G3 has no entries in goalToProjectIds
    const { goalToProjectIds: sparseMap } = buildGoalProjectMaps([
      { goal_id: "goal-1", project_id: "proj-1" },
      { goal_id: "goal-2", project_id: "proj-2" },
      // goal-3 intentionally absent
    ]);
    const result = filterProjects({
      ...base,
      selectedGoalIds: ["goal-3"],
      selectedTasks: [],
      goalToProjectIds: sparseMap,
    });
    // G3 has no project links → constraint must be inactive → all active projects returned
    expect(result.map((p) => p.id)).toEqual(ALL_PROJECTS.map((p) => p.id));
  });

  it("goal with project links + no area → shows only linked projects", () => {
    const { goalToProjectIds: sparseMap } = buildGoalProjectMaps([
      { goal_id: "goal-1", project_id: "proj-1" },
    ]);
    const result = filterProjects({
      ...base,
      selectedGoalIds: ["goal-1"],
      selectedTasks: [],
      goalToProjectIds: sparseMap,
    });
    expect(result.map((p) => p.id)).toEqual(["proj-1"]);
  });
});

// ── filterGoals ──────────────────────────────────────────────────────────────

describe("filterGoals", () => {
  const base = { allGoals: ALL_GOALS, selectedAreaIds: [], selectedGoalIds: [], selectedProjectIds: [], selectedTaskIds: [] };

  it("returns all active goals when no constraints", () => {
    expect(filterGoals({ ...base, selectedTasks: [], taskToGoalIds, projectToGoalIds })).toEqual(ALL_GOALS);
  });

  it("filters by areas only", () => {
    expect(filterGoals({ ...base, selectedAreaIds: ["area-1"], selectedTasks: [], taskToGoalIds, projectToGoalIds })).toEqual([G1, G3]);
  });

  it("filters by projects only", () => {
    expect(filterGoals({ ...base, selectedProjectIds: ["proj-1"], selectedTasks: [], taskToGoalIds, projectToGoalIds })).toEqual([G1]);
  });

  it("filters by tasks only", () => {
    expect(filterGoals({ ...base, selectedTaskIds: ["task-1"], selectedTasks: [T1], taskToGoalIds, projectToGoalIds })).toEqual([G1]);
  });

  it("includes goals linked to task's project (indirect link)", () => {
    // T4 has no direct goal link, but project_id "proj-1" → goal-1
    expect(filterGoals({ ...base, selectedTaskIds: ["task-4"], selectedTasks: [T4], taskToGoalIds, projectToGoalIds })).toEqual([G1]);
  });

  it("intersects areas + projects", () => {
    // area-1 → G1, G3; proj-2 → G2; intersection = empty
    expect(filterGoals({ ...base, selectedAreaIds: ["area-1"], selectedProjectIds: ["proj-2"], selectedTasks: [], taskToGoalIds, projectToGoalIds })).toEqual([]);
  });

  it("intersects areas + tasks", () => {
    // area-1 → G1, G3; T2 → G2; intersection = empty
    expect(filterGoals({ ...base, selectedAreaIds: ["area-1"], selectedTaskIds: ["task-2"], selectedTasks: [T2], taskToGoalIds, projectToGoalIds })).toEqual([]);
  });

  it("intersects projects + tasks", () => {
    // proj-1 → G1; T2 → G2; intersection = empty
    expect(filterGoals({ ...base, selectedProjectIds: ["proj-1"], selectedTaskIds: ["task-2"], selectedTasks: [T2], taskToGoalIds, projectToGoalIds })).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → G1, G3; proj-1 → G1; T1 → G1
    expect(filterGoals({ ...base, selectedAreaIds: ["area-1"], selectedProjectIds: ["proj-1"], selectedTaskIds: ["task-1"], selectedTasks: [T1], taskToGoalIds, projectToGoalIds })).toEqual([G1]);
  });
});

// ── filterTasks ──────────────────────────────────────────────────────────────

describe("filterTasks", () => {
  const base = { allTasks: ALL_TASKS, selectedAreaIds: [], selectedGoalIds: [], selectedProjectIds: [] };

  it("returns all tasks when no constraints", () => {
    expect(filterTasks({ ...base, goalToTaskIds })).toEqual(ALL_TASKS);
  });

  it("filters by areas only", () => {
    expect(filterTasks({ ...base, selectedAreaIds: ["area-1"], goalToTaskIds })).toEqual([T1, T3, T4]);
  });

  it("filters by projects only", () => {
    expect(filterTasks({ ...base, selectedProjectIds: ["proj-1"], goalToTaskIds })).toEqual([T1, T4]);
  });

  it("filters by goals only", () => {
    // goal-1 directly linked to T1 only (not T4)
    expect(filterTasks({ ...base, selectedGoalIds: ["goal-1"], goalToTaskIds })).toEqual([T1]);
  });

  it("intersects areas + projects", () => {
    // area-1 → T1, T3, T4; proj-2 → T2; intersection = empty
    expect(filterTasks({ ...base, selectedAreaIds: ["area-1"], selectedProjectIds: ["proj-2"], goalToTaskIds })).toEqual([]);
  });

  it("intersects areas + goals", () => {
    // area-1 → T1, T3, T4; goal-2 → T2; intersection = empty
    expect(filterTasks({ ...base, selectedAreaIds: ["area-1"], selectedGoalIds: ["goal-2"], goalToTaskIds })).toEqual([]);
  });

  it("intersects projects + goals", () => {
    // proj-1 → T1, T4; goal-2 → T2; intersection = empty
    expect(filterTasks({ ...base, selectedProjectIds: ["proj-1"], selectedGoalIds: ["goal-2"], goalToTaskIds })).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → T1, T3, T4; proj-1 → T1, T4; goal-1 → T1
    expect(filterTasks({ ...base, selectedAreaIds: ["area-1"], selectedProjectIds: ["proj-1"], selectedGoalIds: ["goal-1"], goalToTaskIds })).toEqual([T1]);
  });
});

// ── cleanInvalidSelections ──────────────────────────────────────────────────

describe("cleanInvalidSelections", () => {
  it("returns unchanged when all selections valid", () => {
    const result = cleanInvalidSelections(
      { selectedAreaIds: ["area-1"], selectedGoalIds: ["goal-1"], selectedProjectIds: ["proj-1"], selectedTaskIds: ["task-1"] },
      { visibleAreas: [A1], filteredGoals: [G1], filteredProjects: [P1], filteredTasks: [T1] },
    );
    expect(result.changed).toBe(false);
  });

  it("strips stale selections", () => {
    const result = cleanInvalidSelections(
      { selectedAreaIds: ["area-1", "area-99"], selectedGoalIds: ["goal-1"], selectedProjectIds: ["proj-99"], selectedTaskIds: ["task-1"] },
      { visibleAreas: [A1], filteredGoals: [G1], filteredProjects: [P1], filteredTasks: [T1] },
    );
    expect(result.changed).toBe(true);
    expect(result.areaIds).toEqual(["area-1"]);
    expect(result.projectIds).toEqual([]);
  });
});
