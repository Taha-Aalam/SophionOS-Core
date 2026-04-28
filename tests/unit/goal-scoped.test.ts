import { describe, expect, it } from "vitest";

import {
  applyGoalScopedDefaults,
  filterAllowedProjectsForGoal,
  isProjectAllowedForGoalScopedTask,
} from "../../src/lib/utils/goal-scoped";

describe("applyGoalScopedDefaults", () => {
  const baseValues = {
    name: "Build something",
    area_id: "area-from-user-input",
    goal_ids: ["unrelated-goal-1", "unrelated-goal-2"],
  };

  it("forces area_id and goal_ids to come from the goal-scoped config", () => {
    const result = applyGoalScopedDefaults(baseValues, {
      goalId: "goal-uuid",
      areaId: "area-from-goal",
    });

    expect(result.area_id).toBe("area-from-goal");
    expect(result.goal_ids).toEqual(["goal-uuid"]);
  });

  it("uses an empty area_id when the parent goal has no area", () => {
    const result = applyGoalScopedDefaults(baseValues, {
      goalId: "goal-uuid",
      areaId: null,
    });

    expect(result.area_id).toBe("");
    expect(result.goal_ids).toEqual(["goal-uuid"]);
  });

  it("preserves all other fields untouched", () => {
    const result = applyGoalScopedDefaults(baseValues, {
      goalId: "goal-uuid",
      areaId: "area-from-goal",
    });

    expect(result.name).toBe("Build something");
  });
});

describe("filterAllowedProjectsForGoal", () => {
  const projects = [
    { id: "p1", name: "P1" },
    { id: "p2", name: "P2" },
    { id: "p3", name: "P3" },
  ];

  it("returns only projects whose ids are in the allow list", () => {
    expect(filterAllowedProjectsForGoal(projects, ["p1", "p3"])).toEqual([
      { id: "p1", name: "P1" },
      { id: "p3", name: "P3" },
    ]);
  });

  it("returns an empty list when no projects are linked to the goal", () => {
    expect(filterAllowedProjectsForGoal(projects, [])).toEqual([]);
  });

  it("ignores ids that don't match any project", () => {
    expect(filterAllowedProjectsForGoal(projects, ["missing"])).toEqual([]);
  });
});

describe("isProjectAllowedForGoalScopedTask", () => {
  it("treats unassigned (empty/null) project as always allowed", () => {
    expect(isProjectAllowedForGoalScopedTask("", ["p1"])).toBe(true);
    expect(isProjectAllowedForGoalScopedTask(null, ["p1"])).toBe(true);
    expect(isProjectAllowedForGoalScopedTask(undefined, [])).toBe(true);
  });

  it("allows project ids in the allow list and rejects others", () => {
    expect(isProjectAllowedForGoalScopedTask("p1", ["p1", "p2"])).toBe(true);
    expect(isProjectAllowedForGoalScopedTask("p3", ["p1", "p2"])).toBe(false);
  });
});
