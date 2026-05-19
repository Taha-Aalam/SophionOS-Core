// src/lib/__tests__/task-dialog-filters.test.ts
import { describe, expect, it } from "vitest";
import {
  computeFilteredProjects,
  computeVisibleGoals,
  computeVisibleAreas,
} from "@/lib/utils/task-dialog-filters";

// ── helpers ──────────────────────────────────────────────────────────────────

type P = {
  id: string;
  area_id?: string | null;
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
};

type G = {
  id: string;
  area_id: string | null;
  linkedAreaIds?: string[];
};

function project(
  id: string,
  area_id: string | null,
  linkedGoalIds: string[] = [],
  linkedAreaIds: string[] = [],
): P {
  return { id, area_id, linkedGoalIds, linkedAreaIds };
}

function goal(
  id: string,
  area_id: string | null,
  linkedAreaIds: string[] = [],
): G {
  return { id, area_id, linkedAreaIds };
}

// ── data fixtures ─────────────────────────────────────────────────────────────
//
//  A1 ─── G1 ─── P1
//      └── G2 ─── P2
//
const A1 = "area-1";
const G1 = "goal-1";
const G2 = "goal-2";
const P1 = project("proj-1", A1, [G1]);
const P2 = project("proj-2", A1, [G2]);
const GOAL_1 = goal(G1, A1);
const GOAL_2 = goal(G2, A1);
const ALL_PROJECTS = [P1, P2];
const ALL_GOALS = [GOAL_1, GOAL_2];

// ── computeFilteredProjects ───────────────────────────────────────────────────

describe("computeFilteredProjects", () => {
  it("returns all projects when no constraints", () => {
    expect(computeFilteredProjects(ALL_PROJECTS, [], [])).toEqual(ALL_PROJECTS);
  });

  it("filters by area only", () => {
    const A2 = "area-2";
    const P3 = project("proj-3", A2, []);
    expect(computeFilteredProjects([P1, P2, P3], [], [A1])).toEqual([P1, P2]);
  });

  it("filters by goal only", () => {
    expect(computeFilteredProjects(ALL_PROJECTS, [G1], [])).toEqual([P1]);
  });

  it("filters by goal AND area — intersection", () => {
    // Both P1 and P2 are in A1, but only P1 is linked to G1
    expect(computeFilteredProjects(ALL_PROJECTS, [G1], [A1])).toEqual([P1]);
  });

  it("returns empty when goal matches nothing in the given area", () => {
    const A2 = "area-2";
    const P3 = project("proj-3", A2, [G1]); // G1 project but in A2
    // selected area A1 does not contain P3
    expect(computeFilteredProjects([P3], [G1], [A1])).toEqual([]);
  });

  it("includes project whose area appears in linkedAreaIds (not only area_id)", () => {
    const A2 = "area-2";
    const P3 = project("proj-3", null, [G1], [A2]);
    expect(computeFilteredProjects([P3], [G1], [A2])).toEqual([P3]);
  });

  it("excludes project with no linkedGoalIds when goal is selected", () => {
    const P_no_goals = project("proj-x", A1, undefined);
    expect(computeFilteredProjects([P_no_goals], [G1], [])).toEqual([]);
  });

  it("handles multiple selected goals — shows projects linked to ANY selected goal", () => {
    expect(computeFilteredProjects(ALL_PROJECTS, [G1, G2], [])).toEqual([P1, P2]);
  });
});

// ── computeVisibleGoals ───────────────────────────────────────────────────────

describe("computeVisibleGoals", () => {
  const projectById = new Map([
    [P1.id, P1],
    [P2.id, P2],
  ]);

  it("returns all goals when no constraints", () => {
    expect(computeVisibleGoals(ALL_GOALS, null, [], projectById)).toEqual(ALL_GOALS);
  });

  it("filters by area only", () => {
    const A2 = "area-2";
    const G3 = goal("goal-3", A2);
    expect(computeVisibleGoals([GOAL_1, GOAL_2, G3], null, [A1], projectById)).toEqual([GOAL_1, GOAL_2]);
  });

  it("filters by project only — shows only goals linked to project", () => {
    expect(computeVisibleGoals(ALL_GOALS, P2.id, [], projectById)).toEqual([GOAL_2]);
  });

  it("filters by project AND area — intersection", () => {
    // P2 is linked to G2 only; G2 is in A1; selecting A1 + P2 should show G2 only
    expect(computeVisibleGoals(ALL_GOALS, P2.id, [A1], projectById)).toEqual([GOAL_2]);
  });

  it("returns all goals when project has no linkedGoalIds (no project constraint)", () => {
    const P_no_goals = project("proj-x", A1, undefined);
    const mapWithPNoGoals = new Map([[P_no_goals.id, P_no_goals]]);
    expect(computeVisibleGoals(ALL_GOALS, P_no_goals.id, [], mapWithPNoGoals)).toEqual(ALL_GOALS);
  });

  it("applies area filter when project has no linkedGoalIds", () => {
    const A2 = "area-2";
    const G3 = goal("goal-3", A2);
    const P_no_goals = project("proj-x", A1, undefined);
    const m = new Map([[P_no_goals.id, P_no_goals]]);
    expect(computeVisibleGoals([GOAL_1, GOAL_2, G3], P_no_goals.id, [A1], m)).toEqual([GOAL_1, GOAL_2]);
  });

  it("excludes goal that is not in project linkedGoalIds even if it matches area", () => {
    // P2 is only linked to G2; G1 is also in A1, but should NOT appear
    expect(computeVisibleGoals(ALL_GOALS, P2.id, [A1], projectById)).not.toContainEqual(GOAL_1);
  });
});

// ── computeVisibleAreas ───────────────────────────────────────────────────────

type A = { id: string };

function area(id: string): A {
  return { id };
}

const AR1 = area("area-1");
const AR2 = area("area-2");
const AR3 = area("area-3");

// G1 is in AR1; G2 is in AR2; P1 is in AR1+AR2; P2 is in AR3
const G1_a = goal(G1, "area-1");
const G2_a = goal(G2, "area-2");
const P1_a = project("proj-1", "area-1", [], ["area-2"]); // area-1 via area_id, area-2 via linkedAreaIds
const P2_a = project("proj-2", "area-3");

const projectByIdA = new Map([
  [P1_a.id, P1_a],
  [P2_a.id, P2_a],
]);
const goalsA = [G1_a, G2_a];
const allAreas = [AR1, AR2, AR3];

describe("computeVisibleAreas", () => {
  it("returns all areas when no constraints", () => {
    expect(computeVisibleAreas(allAreas, [], null, projectByIdA, goalsA)).toEqual(allAreas);
  });

  it("goal only — returns areas linked to selected goals", () => {
    // G1 links to AR1
    expect(computeVisibleAreas(allAreas, [G1], null, projectByIdA, goalsA)).toEqual([AR1]);
  });

  it("project only — returns areas linked to selected project", () => {
    // P1 links to AR1 + AR2
    expect(computeVisibleAreas(allAreas, [], P1_a.id, projectByIdA, goalsA)).toEqual([AR1, AR2]);
  });

  it("goal + project — AND-intersection of their areas", () => {
    // G1 → AR1; P1 → AR1+AR2; intersection → AR1 only
    expect(computeVisibleAreas(allAreas, [G1], P1_a.id, projectByIdA, goalsA)).toEqual([AR1]);
  });

  it("goal + project with no shared areas — returns empty", () => {
    // G1 → AR1; P2 → AR3; no overlap
    expect(computeVisibleAreas(allAreas, [G1], P2_a.id, projectByIdA, goalsA)).toEqual([]);
  });

  it("multiple goals — union of goal areas, then AND with project", () => {
    // G1 → AR1; G2 → AR2; union → AR1+AR2; P1 → AR1+AR2; intersection → AR1+AR2
    expect(computeVisibleAreas(allAreas, [G1, G2], P1_a.id, projectByIdA, goalsA)).toEqual([AR1, AR2]);
  });
});
