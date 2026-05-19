// src/lib/__tests__/resource-dialog-filters.test.ts
import { describe, expect, it } from "vitest";
import {
  computeVisibleAreas,
  computeFilteredProjects,
  computeFilteredGoals,
  computeFilteredTasks,
} from "@/lib/utils/resource-dialog-filters";

// ── helpers ──────────────────────────────────────────────────────────────────

function area(id: string) {
  return { id };
}

function project(
  id: string,
  area_id: string | null,
  linkedAreaIds: string[] = [],
) {
  return { id, area_id, linkedAreaIds };
}

function goal(
  id: string,
  area_id: string | null,
  linkedAreaIds: string[] = [],
) {
  return { id, area_id, linkedAreaIds };
}

function task(
  id: string,
  opts: {
    area_id?: string | null;
    linkedAreaIds?: string[];
    project_id?: string | null;
  } = {},
) {
  return { id, area_id: null, linkedAreaIds: [], project_id: null, ...opts };
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const A1 = area("area-1");
const A2 = area("area-2");
const A3 = area("area-3");
const ALL_AREAS = [A1, A2, A3];

const P1 = project("proj-1", "area-1");
const P2 = project("proj-2", "area-2");
const P3 = project("proj-3", null, ["area-1"]); // linkedAreaIds only
const ALL_PROJECTS = [P1, P2, P3];

const G1 = goal("goal-1", "area-1");
const G2 = goal("goal-2", "area-2");
const G3 = goal("goal-3", null, ["area-1"]); // linkedAreaIds only
const ALL_GOALS = [G1, G2, G3];

const T1 = task("task-1", { area_id: "area-1", project_id: "proj-1" });
const T2 = task("task-2", { area_id: "area-2", project_id: "proj-2" });
const T3 = task("task-3", { linkedAreaIds: ["area-1"], project_id: "proj-3" });
const T4 = task("task-4", {
  area_id: "area-1",
  project_id: "proj-1",
}); // no direct goal link
const ALL_TASKS = [T1, T2, T3, T4];

// Relation maps (from join tables)
const goalProjectIdsMap = new Map<string, string[]>([
  ["goal-1", ["proj-1"]],
  ["goal-2", ["proj-2"]],
]);
const projectGoalIdsMap = new Map<string, string[]>([
  ["proj-1", ["goal-1"]],
  ["proj-2", ["goal-2"]],
]);
const goalTaskIdsMap = new Map<string, string[]>([
  ["goal-1", ["task-1"]],
  ["goal-2", ["task-2"]],
]);
const taskGoalIdsMap = new Map<string, string[]>([
  ["task-1", ["goal-1"]],
  ["task-2", ["goal-2"]],
]);

// ── computeVisibleAreas ──────────────────────────────────────────────────────

describe("computeVisibleAreas", () => {
  it("returns all areas when no constraints", () => {
    expect(computeVisibleAreas(ALL_AREAS, null, [], [])).toEqual(ALL_AREAS);
  });

  it("filters by project only", () => {
    expect(computeVisibleAreas(ALL_AREAS, P1, [], [])).toEqual([A1]);
  });

  it("filters by project via linkedAreaIds", () => {
    expect(computeVisibleAreas(ALL_AREAS, P3, [], [])).toEqual([A1]);
  });

  it("filters by goals only", () => {
    expect(computeVisibleAreas(ALL_AREAS, null, [G1], [])).toEqual([A1]);
  });

  it("filters by goals with linkedAreaIds", () => {
    expect(computeVisibleAreas(ALL_AREAS, null, [G3], [])).toEqual([A1]);
  });

  it("filters by tasks only", () => {
    expect(computeVisibleAreas(ALL_AREAS, null, [], [T1])).toEqual([A1]);
  });

  it("filters by tasks with linkedAreaIds", () => {
    expect(computeVisibleAreas(ALL_AREAS, null, [], [T3])).toEqual([A1]);
  });

  it("filters by multiple tasks (union of their areas)", () => {
    // T1 → area-1, T2 → area-2 → union = area-1, area-2
    expect(computeVisibleAreas(ALL_AREAS, null, [], [T1, T2])).toEqual([
      A1, A2,
    ]);
  });

  it("intersects project + goals", () => {
    // P1 → area-1; G2 → area-2; intersection = empty
    expect(computeVisibleAreas(ALL_AREAS, P1, [G2], [])).toEqual([]);
    // P1 → area-1; G1 → area-1; intersection = area-1
    expect(computeVisibleAreas(ALL_AREAS, P1, [G1], [])).toEqual([A1]);
  });

  it("intersects goals + tasks", () => {
    // G1 → area-1; T2 → area-2; intersection = empty
    expect(computeVisibleAreas(ALL_AREAS, null, [G1], [T2])).toEqual([]);
    // G1 → area-1; T1 → area-1; intersection = area-1
    expect(computeVisibleAreas(ALL_AREAS, null, [G1], [T1])).toEqual([A1]);
  });

  it("intersects project + tasks", () => {
    // P1 → area-1; T2 → area-2; intersection = empty
    expect(computeVisibleAreas(ALL_AREAS, P1, [], [T2])).toEqual([]);
  });

  it("intersects all three", () => {
    // P1 → area-1; G1 → area-1; T1 → area-1; all match
    expect(computeVisibleAreas(ALL_AREAS, P1, [G1], [T1])).toEqual([A1]);
    // P1 → area-1; G1 → area-1; T2 → area-2; T2 doesn't match
    expect(computeVisibleAreas(ALL_AREAS, P1, [G1], [T2])).toEqual([]);
  });
});

// ── computeFilteredProjects ──────────────────────────────────────────────────

describe("computeFilteredProjects", () => {
  const emptyMap = new Map<string, string[]>();

  it("returns all projects when no constraints", () => {
    expect(computeFilteredProjects(ALL_PROJECTS, [], [], emptyMap)).toEqual(
      ALL_PROJECTS,
    );
  });

  it("filters by areas only", () => {
    expect(
      computeFilteredProjects(ALL_PROJECTS, ["area-1"], [], emptyMap),
    ).toEqual([P1, P3]);
  });

  it("filters by goals only", () => {
    expect(
      computeFilteredProjects(
        ALL_PROJECTS,
        [],
        ["goal-1"],
        goalProjectIdsMap,
      ),
    ).toEqual([P1]);
  });

  it("filters by tasks only", () => {
    expect(
      computeFilteredProjects(ALL_PROJECTS, [], [], emptyMap, [T1]),
    ).toEqual([P1]);
  });

  it("filters by multiple tasks (union of their projects)", () => {
    // T1 → proj-1, T2 → proj-2 → union = proj-1, proj-2
    expect(
      computeFilteredProjects(ALL_PROJECTS, [], [], emptyMap, [T1, T2]),
    ).toEqual([P1, P2]);
  });

  it("intersects areas + goals", () => {
    // area-1 → P1, P3; goal-2 → P2; intersection = empty
    expect(
      computeFilteredProjects(
        ALL_PROJECTS,
        ["area-1"],
        ["goal-2"],
        goalProjectIdsMap,
      ),
    ).toEqual([]);
    // area-1 → P1, P3; goal-1 → P1; intersection = P1
    expect(
      computeFilteredProjects(
        ALL_PROJECTS,
        ["area-1"],
        ["goal-1"],
        goalProjectIdsMap,
      ),
    ).toEqual([P1]);
  });

  it("intersects areas + tasks", () => {
    // area-1 → P1, P3; T2 (proj-2) → P2; intersection = empty
    expect(
      computeFilteredProjects(ALL_PROJECTS, ["area-1"], [], emptyMap, [T2]),
    ).toEqual([]);
  });

  it("intersects goals + tasks", () => {
    // goal-1 → P1; T2 (proj-2) → P2; intersection = empty
    expect(
      computeFilteredProjects(
        ALL_PROJECTS,
        [],
        ["goal-1"],
        goalProjectIdsMap,
        [T2],
      ),
    ).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → P1, P3; goal-1 → P1; T1 (proj-1) → P1
    expect(
      computeFilteredProjects(
        ALL_PROJECTS,
        ["area-1"],
        ["goal-1"],
        goalProjectIdsMap,
        [T1],
      ),
    ).toEqual([P1]);
  });

  it("goal with no linked projects → constraint inactive → shows all projects", () => {
    // goal-3 intentionally absent from goalProjectIdsMap
    const sparseMap = new Map<string, string[]>([
      ["goal-1", ["proj-1"]],
      ["goal-2", ["proj-2"]],
    ]);
    const result = computeFilteredProjects(
      ALL_PROJECTS,
      [],           // no area
      ["goal-3"],   // goal with no project links
      sparseMap,
    );
    expect(result.map((p) => p.id)).toEqual(ALL_PROJECTS.map((p) => p.id));
  });

  it("goal with project links → shows only linked projects", () => {
    const result = computeFilteredProjects(
      ALL_PROJECTS,
      [],
      ["goal-1"],
      goalProjectIdsMap,
    );
    expect(result.map((p) => p.id)).toEqual(["proj-1"]);
  });
});

// ── computeFilteredGoals ─────────────────────────────────────────────────────

describe("computeFilteredGoals", () => {
  const emptyMap = new Map<string, string[]>();

  it("returns all goals when no constraints", () => {
    expect(computeFilteredGoals(ALL_GOALS, [], null, emptyMap)).toEqual(
      ALL_GOALS,
    );
  });

  it("filters by areas only", () => {
    expect(
      computeFilteredGoals(ALL_GOALS, ["area-1"], null, emptyMap),
    ).toEqual([G1, G3]); // G1 area-1, G3 linkedAreaIds area-1
  });

  it("filters by project only", () => {
    expect(
      computeFilteredGoals(ALL_GOALS, null, "proj-1", projectGoalIdsMap),
    ).toEqual([G1]);
  });

  it("filters by tasks only", () => {
    expect(
      computeFilteredGoals(
        ALL_GOALS,
        null,
        null,
        emptyMap,
        taskGoalIdsMap,
        [T1],
      ),
    ).toEqual([G1]);
  });

  it("includes goals linked to task's project (indirect link)", () => {
    // T4 has no direct goal link, but project_id "proj-1" → goal-1
    expect(
      computeFilteredGoals(
        ALL_GOALS,
        null,
        null,
        projectGoalIdsMap,
        taskGoalIdsMap,
        [T4],
      ),
    ).toEqual([G1]);
  });

  it("intersects areas + project", () => {
    // area-1 → G1, G3; proj-2 → G2; intersection = empty
    expect(
      computeFilteredGoals(
        ALL_GOALS,
        ["area-1"],
        "proj-2",
        projectGoalIdsMap,
      ),
    ).toEqual([]);
  });

  it("intersects areas + tasks", () => {
    // area-1 → G1, G3; T2 → G2; intersection = empty
    expect(
      computeFilteredGoals(
        ALL_GOALS,
        ["area-1"],
        null,
        emptyMap,
        taskGoalIdsMap,
        [T2],
      ),
    ).toEqual([]);
  });

  it("intersects project + tasks", () => {
    // proj-1 → G1; T2 → G2; intersection = empty
    expect(
      computeFilteredGoals(
        ALL_GOALS,
        null,
        "proj-1",
        projectGoalIdsMap,
        taskGoalIdsMap,
        [T2],
      ),
    ).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → G1, G3; proj-1 → G1; T1 → G1
    expect(
      computeFilteredGoals(
        ALL_GOALS,
        ["area-1"],
        "proj-1",
        projectGoalIdsMap,
        taskGoalIdsMap,
        [T1],
      ),
    ).toEqual([G1]);
  });
});

// ── computeFilteredTasks ─────────────────────────────────────────────────────

describe("computeFilteredTasks", () => {
  it("returns all tasks when no constraints", () => {
    expect(computeFilteredTasks(ALL_TASKS, [], null, [])).toEqual(ALL_TASKS);
  });

  it("filters by areas only", () => {
    // T1 (area-1), T3 (linkedAreaIds area-1), T4 (area-1) all match
    expect(computeFilteredTasks(ALL_TASKS, ["area-1"], null, [])).toEqual([
      T1, T3, T4,
    ]);
  });

  it("filters by project only", () => {
    // T1 and T4 both have project_id "proj-1"
    expect(computeFilteredTasks(ALL_TASKS, null, "proj-1", [])).toEqual([
      T1, T4,
    ]);
  });

  it("filters by goals only", () => {
    // goal-1 is directly linked to T1 only (not T4, even though T4's project links to goal-1)
    expect(
      computeFilteredTasks(ALL_TASKS, null, null, ["goal-1"], goalTaskIdsMap),
    ).toEqual([T1]);
  });

  it("intersects areas + project", () => {
    // area-1 → T1, T3; proj-2 → T2; intersection = empty
    expect(computeFilteredTasks(ALL_TASKS, ["area-1"], "proj-2", [])).toEqual(
      [],
    );
  });

  it("intersects areas + goals", () => {
    // area-1 → T1, T3; goal-2 → T2; intersection = empty
    expect(
      computeFilteredTasks(
        ALL_TASKS,
        ["area-1"],
        null,
        ["goal-2"],
        goalTaskIdsMap,
      ),
    ).toEqual([]);
  });

  it("intersects project + goals", () => {
    // proj-1 → T1; goal-2 → T2; intersection = empty
    expect(
      computeFilteredTasks(
        ALL_TASKS,
        null,
        "proj-1",
        ["goal-2"],
        goalTaskIdsMap,
      ),
    ).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → T1, T3, T4; proj-1 → T1, T4; goal-1 → T1 (direct link only)
    // Intersection: T1 (only task matching all 3)
    expect(
      computeFilteredTasks(
        ALL_TASKS,
        ["area-1"],
        "proj-1",
        ["goal-1"],
        goalTaskIdsMap,
      ),
    ).toEqual([T1]);
  });
});
