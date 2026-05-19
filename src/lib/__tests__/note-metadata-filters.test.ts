// src/lib/__tests__/note-metadata-filters.test.ts
import { describe, expect, it } from "vitest";
import {
  computeNoteVisibleAreas,
  computeNoteFilteredProjects,
  computeNoteFilteredGoals,
  computeNoteFilteredTasks,
} from "@/lib/utils/note-metadata-filters";

// ── helpers ──────────────────────────────────────────────────────────────────

function area(id: string) {
  return { id };
}

function project(id: string, opts: { linkedAreaIds?: string[]; linkedGoalIds?: string[] } = {}) {
  return { id, linkedAreaIds: [], linkedGoalIds: [], ...opts };
}

function goal(id: string, opts: { linkedAreaIds?: string[] } = {}) {
  return { id, linkedAreaIds: [], ...opts };
}

function task(id: string, opts: { project_id?: string | null } = {}) {
  return { id, project_id: null, ...opts };
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const A1 = area("area-1");
const A2 = area("area-2");
const A3 = area("area-3");
const ALL_AREAS = [A1, A2, A3];

const P1 = project("proj-1", { linkedAreaIds: ["area-1"], linkedGoalIds: ["goal-1"] });
const P2 = project("proj-2", { linkedAreaIds: ["area-2"], linkedGoalIds: ["goal-2"] });
const P3 = project("proj-3", { linkedAreaIds: ["area-1"] });
const ALL_PROJECTS = [P1, P2, P3];

const G1 = goal("goal-1", { linkedAreaIds: ["area-1"] });
const G2 = goal("goal-2", { linkedAreaIds: ["area-2"] });
const G3 = goal("goal-3", { linkedAreaIds: ["area-1"] });
const ALL_GOALS = [G1, G2, G3];

const T1 = task("task-1", { project_id: "proj-1" });
const T2 = task("task-2", { project_id: "proj-2" });
const T3 = task("task-3", { project_id: "proj-3" });
const T4 = task("task-4", { project_id: "proj-1" }); // no direct goal link
const ALL_TASKS = [T1, T2, T3, T4];

// ── computeNoteVisibleAreas ──────────────────────────────────────────────────

describe("computeNoteVisibleAreas", () => {
  it("returns all areas when no constraints", () => {
    expect(computeNoteVisibleAreas(ALL_AREAS, [], [], [], ALL_PROJECTS, ALL_GOALS, ALL_TASKS)).toEqual(ALL_AREAS);
  });

  it("filters by projects only", () => {
    expect(computeNoteVisibleAreas(ALL_AREAS, ["proj-1"], [], [], ALL_PROJECTS, ALL_GOALS, ALL_TASKS)).toEqual([A1]);
  });

  it("filters by goals only", () => {
    expect(computeNoteVisibleAreas(ALL_AREAS, [], ["goal-1"], [], ALL_PROJECTS, ALL_GOALS, ALL_TASKS)).toEqual([A1]);
  });

  it("filters by tasks only", () => {
    // T1 → proj-1 → area-1
    expect(computeNoteVisibleAreas(ALL_AREAS, [], [], ["task-1"], ALL_PROJECTS, ALL_GOALS, ALL_TASKS)).toEqual([A1]);
  });

  it("intersects projects + goals", () => {
    // P1 → area-1; G2 → area-2; intersection = empty
    expect(computeNoteVisibleAreas(ALL_AREAS, ["proj-1"], ["goal-2"], [], ALL_PROJECTS, ALL_GOALS, ALL_TASKS)).toEqual([]);
  });

  it("intersects all three", () => {
    // P1 → area-1; G1 → area-1; T1 → proj-1 → area-1
    expect(computeNoteVisibleAreas(ALL_AREAS, ["proj-1"], ["goal-1"], ["task-1"], ALL_PROJECTS, ALL_GOALS, ALL_TASKS)).toEqual([A1]);
  });
});

// ── computeNoteFilteredProjects ──────────────────────────────────────────────

describe("computeNoteFilteredProjects", () => {
  it("returns all projects when no constraints", () => {
    expect(computeNoteFilteredProjects(ALL_PROJECTS, [], [], [], ALL_TASKS)).toEqual(ALL_PROJECTS);
  });

  it("filters by areas only", () => {
    expect(computeNoteFilteredProjects(ALL_PROJECTS, ["area-1"], [], [], ALL_TASKS)).toEqual([P1, P3]);
  });

  it("filters by goals only", () => {
    // P1 has linkedGoalIds: ["goal-1"]
    expect(computeNoteFilteredProjects(ALL_PROJECTS, [], ["goal-1"], [], ALL_TASKS)).toEqual([P1]);
  });

  it("filters by tasks only", () => {
    // T1 → proj-1
    expect(computeNoteFilteredProjects(ALL_PROJECTS, [], [], ["task-1"], ALL_TASKS)).toEqual([P1]);
  });

  it("intersects areas + goals", () => {
    // area-1 → P1, P3; goal-2 → P2; intersection = empty
    expect(computeNoteFilteredProjects(ALL_PROJECTS, ["area-1"], ["goal-2"], [], ALL_TASKS)).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → P1, P3; goal-1 → P1; T1 → proj-1
    expect(computeNoteFilteredProjects(ALL_PROJECTS, ["area-1"], ["goal-1"], ["task-1"], ALL_TASKS)).toEqual([P1]);
  });
});

// ── computeNoteFilteredGoals ─────────────────────────────────────────────────

describe("computeNoteFilteredGoals", () => {
  it("returns all goals when no constraints", () => {
    expect(computeNoteFilteredGoals(ALL_GOALS, [], [], [], ALL_PROJECTS, ALL_TASKS)).toEqual(ALL_GOALS);
  });

  it("filters by areas only", () => {
    expect(computeNoteFilteredGoals(ALL_GOALS, ["area-1"], [], [], ALL_PROJECTS, ALL_TASKS)).toEqual([G1, G3]);
  });

  it("filters by projects only", () => {
    // P1 has linkedGoalIds: ["goal-1"]
    expect(computeNoteFilteredGoals(ALL_GOALS, [], ["proj-1"], [], ALL_PROJECTS, ALL_TASKS)).toEqual([G1]);
  });

  it("filters by tasks only", () => {
    // T1 → proj-1 → linkedGoalIds: ["goal-1"]
    expect(computeNoteFilteredGoals(ALL_GOALS, [], [], ["task-1"], ALL_PROJECTS, ALL_TASKS)).toEqual([G1]);
  });

  it("intersects areas + projects", () => {
    // area-1 → G1, G3; proj-2 → G2; intersection = empty
    expect(computeNoteFilteredGoals(ALL_GOALS, ["area-1"], ["proj-2"], [], ALL_PROJECTS, ALL_TASKS)).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → G1, G3; proj-1 → G1; T1 → proj-1 → G1
    expect(computeNoteFilteredGoals(ALL_GOALS, ["area-1"], ["proj-1"], ["task-1"], ALL_PROJECTS, ALL_TASKS)).toEqual([G1]);
  });
});

// ── computeNoteFilteredTasks ─────────────────────────────────────────────────

describe("computeNoteFilteredTasks", () => {
  it("returns all tasks when no constraints", () => {
    expect(computeNoteFilteredTasks(ALL_TASKS, [], [], [], ALL_PROJECTS)).toEqual(ALL_TASKS);
  });

  it("filters by areas only", () => {
    // area-1 → P1, P3 → proj-1, proj-3 → T1, T3, T4
    expect(computeNoteFilteredTasks(ALL_TASKS, ["area-1"], [], [], ALL_PROJECTS)).toEqual([T1, T3, T4]);
  });

  it("filters by projects only", () => {
    expect(computeNoteFilteredTasks(ALL_TASKS, [], ["proj-1"], [], ALL_PROJECTS)).toEqual([T1, T4]);
  });

  it("filters by goals only", () => {
    // goal-1 → P1 (via linkedGoalIds) → proj-1 → T1, T4
    expect(computeNoteFilteredTasks(ALL_TASKS, [], [], ["goal-1"], ALL_PROJECTS)).toEqual([T1, T4]);
  });

  it("intersects areas + projects", () => {
    // area-1 → P1, P3; proj-2 → T2; intersection = empty
    expect(computeNoteFilteredTasks(ALL_TASKS, ["area-1"], ["proj-2"], [], ALL_PROJECTS)).toEqual([]);
  });

  it("intersects all three", () => {
    // area-1 → P1, P3; proj-1 → T1, T4; goal-1 → P1 → T1, T4
    expect(computeNoteFilteredTasks(ALL_TASKS, ["area-1"], ["proj-1"], ["goal-1"], ALL_PROJECTS)).toEqual([T1, T4]);
  });
});
