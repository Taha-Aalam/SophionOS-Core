import { describe, expect, it } from "vitest";

import type { Goal } from "@/lib/types/domain.types";
import { getAreaRollups } from "@/lib/utils/areas";
import { calculateGoalProgress, goalMatchesFilters } from "@/lib/utils/goals";

function buildGoal(overrides: Partial<Goal> & { linkedAreaIds?: string[] } = {}): Goal {
  return {
    area_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    description: null,
    id: "goal-id",
    is_archived: false,
    is_completed: false,
    is_inactive: false,
    linkedAreaIds: [],
    name: "Goal",
    priority: "medium",
    progress: 0,
    slug: "goal",
    target_date: null,
    term: "mid",
    updated_at: "2026-01-01T00:00:00.000Z",
    user_id: "user-id",
    ...overrides,
  };
}

describe("goalMatchesFilters", () => {
  it("matches the area filter when the area is linked through linkedAreaIds", () => {
    const goal = buildGoal({
      area_id: "123e4567-e89b-42d3-a456-426614174000",
      linkedAreaIds: [
        "123e4567-e89b-42d3-a456-426614174000",
        "123e4567-e89b-42d3-a456-426614174001",
      ],
    });

    expect(goalMatchesFilters(goal, { areaId: "123e4567-e89b-42d3-a456-426614174001" })).toBe(
      true,
    );
  });
});

describe("getAreaRollups", () => {
  it("counts goals linked through linkedAreaIds even when their primary area differs", () => {
    const rollups = getAreaRollups({
      areaId: "123e4567-e89b-42d3-a456-426614174001",
      goals: [
        buildGoal({
          area_id: "123e4567-e89b-42d3-a456-426614174000",
          linkedAreaIds: [
            "123e4567-e89b-42d3-a456-426614174000",
            "123e4567-e89b-42d3-a456-426614174001",
          ],
        }),
      ],
      notes: [],
      projects: [],
      tasks: [],
    });

    expect(rollups.goalsCount).toBe(1);
  });
});

function buildProject(overrides: Partial<{ is_archived: boolean; status: "active" | "archived" | "completed" | "planning" | "on_hold"; progress: number }> = {}) {
  return { is_archived: false, status: "active" as const, progress: 0, ...overrides };
}

function buildTask(overrides: Partial<{ is_archived: boolean; is_completed: boolean }> = {}) {
  return { is_archived: false, is_completed: false, ...overrides };
}

function buildNote(overrides: Partial<{ is_archived: boolean; status: "active" | "inbox" | "to_review" | "archive" | "completed" }> = {}) {
  return { is_archived: false, status: "inbox" as const, ...overrides };
}

function buildResource(overrides: Partial<{ is_archived: boolean; status: "active" | "inbox" | "to_review" | "completed" }> = {}) {
  return { is_archived: false, status: "inbox" as const, ...overrides };
}

describe("calculateGoalProgress", () => {
  it("returns 100 when goal is already completed", () => {
    expect(calculateGoalProgress({ is_completed: true, progress: 50 })).toBe(100);
  });

  it("returns goal.progress when no tracked items", () => {
    expect(calculateGoalProgress({ is_completed: false, progress: 42 })).toBe(42);
  });

  it("counts all item types proportionally — 1 project(progress=100) + 4 tasks(2 done) + 2 notes(1 done) + 4 resources(2 done) = 6/11 ≈ 55%", () => {
    const projects = [buildProject({ progress: 100 })];
    const tasks = [
      buildTask({ is_completed: true }),
      buildTask({ is_completed: true }),
      buildTask(),
      buildTask(),
    ];
    const notes = [buildNote({ status: "completed" }), buildNote()];
    const resources = [
      buildResource({ status: "completed" }),
      buildResource({ status: "completed" }),
      buildResource(),
      buildResource(),
    ];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, projects, tasks, notes, resources)).toBe(55);
  });

  it("excludes archived projects from total and completed", () => {
    const projects = [
      buildProject({ progress: 100 }),
      buildProject({ is_archived: true, progress: 100 }),
    ];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, projects)).toBe(100);
  });

  it("excludes archived tasks", () => {
    const tasks = [
      buildTask({ is_completed: true }),
      buildTask({ is_archived: true, is_completed: true }),
    ];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, [], tasks)).toBe(100);
  });

  it("excludes notes with status archive", () => {
    const notes = [
      buildNote({ status: "completed" }),
      buildNote({ status: "archive" }),
    ];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, [], [], notes)).toBe(100);
  });

  it("excludes archived notes (is_archived=true)", () => {
    const notes = [buildNote({ status: "completed" }), buildNote({ is_archived: true })];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, [], [], notes)).toBe(100);
  });

  it("excludes archived resources", () => {
    const resources = [buildResource({ status: "completed" }), buildResource({ is_archived: true })];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, [], [], [], resources)).toBe(100);
  });

  it("falls back to goal.progress when all items are archived/excluded", () => {
    const notes = [buildNote({ is_archived: true })];
    expect(calculateGoalProgress({ is_completed: false, progress: 37 }, [], [], notes)).toBe(37);
  });

  it("uses fractional project progress — 1 project at 50% = 50%", () => {
    const projects = [buildProject({ progress: 50 })];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, projects)).toBe(50);
  });

  it("averages two project progresses when only projects present — 60% + 80% = 70%", () => {
    const projects = [buildProject({ progress: 60 }), buildProject({ progress: 80 })];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, projects)).toBe(70);
  });

  it("mixes fractional project with unlinked tasks — 1 project(60%) + 2 tasks(1 done) = 1.6/3 ≈ 53%", () => {
    const projects = [buildProject({ progress: 60 })];
    const tasks = [buildTask({ is_completed: true }), buildTask()];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, projects, tasks)).toBe(53);
  });

  it("project at 0% contributes 0 to progress", () => {
    const projects = [buildProject({ progress: 0 })];
    expect(calculateGoalProgress({ is_completed: false, progress: 0 }, projects)).toBe(0);
  });
});
