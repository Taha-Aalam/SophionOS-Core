import { describe, expect, it } from "vitest";

import {
  filterProjectDialogAreas,
  filterProjectDialogGoals,
} from "../../src/lib/utils/project-dialog-filters";

/**
 * Regression: goal-detail new project must use standard area selector UI
 * (defaultAreaIds + goalId), NOT the locked goalScoped "from goal" presentation.
 * These tests verify that the filter helpers work correctly for preselected
 * defaults used in standard create mode.
 */
describe("goal-detail project create: standard area selector with preselected defaults", () => {
  const areas = [
    { id: "a1", name: "Work" },
    { id: "a2", name: "Health" },
    { id: "a3", name: "Learning" },
  ];
  const goals = [
    { id: "g1", name: "Goal 1", area_id: "a1" },
    { id: "g2", name: "Goal 2", area_id: "a2" },
  ];

  it("defaultAreaIds [a1] plus goalId [g1] produces correct goal filter", () => {
    const filteredGoals = filterProjectDialogGoals(goals, ["a1"]);
    expect(filteredGoals.map((g) => g.id)).toEqual(["g1"]);
  });

  it("defaultAreaIds [a1, a2] plus goalId [g1] produces correct goal filter", () => {
    const filteredGoals = filterProjectDialogGoals(goals, ["a1", "a2"]);
    expect(filteredGoals.map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("preselected area [a1] is retained by filterProjectDialogAreas", () => {
    const result = filterProjectDialogAreas(areas, goals, ["a1"], ["g1"]);
    expect(result.some((a) => a.id === "a1")).toBe(true);
  });

  it("no area preselected returns all areas", () => {
    const result = filterProjectDialogAreas(areas, goals, [], []);
    expect(result).toEqual(areas);
  });
});

describe("filterProjectDialogGoals", () => {
  const goals = [
    { id: "g1", name: "Goal 1", area_id: "a1", is_archived: false },
    { id: "g2", name: "Goal 2", area_id: "a2", is_archived: false },
    { id: "g3", name: "Goal 3", area_id: null, is_archived: false },
  ];

  it("returns every goal when no area is selected", () => {
    expect(filterProjectDialogGoals(goals, [])).toEqual(goals);
  });

  it("returns only goals from the selected area", () => {
    expect(filterProjectDialogGoals(goals, ["a2"])).toEqual([goals[1]]);
  });

  it("returns goals matching any of the selected areas", () => {
    expect(filterProjectDialogGoals(goals, ["a1", "a2"])).toEqual([goals[0], goals[1]]);
  });
});

describe("filterProjectDialogAreas", () => {
  const areas = [
    { id: "a1", name: "Area 1" },
    { id: "a2", name: "Area 2" },
    { id: "a3", name: "Area 3" },
  ];
  const goals = [
    { id: "g1", name: "Goal 1", area_id: "a1" },
    { id: "g2", name: "Goal 2", area_id: "a2" },
    { id: "g3", name: "Goal 3", area_id: null },
  ];

  it("returns every area when no goal is selected", () => {
    expect(filterProjectDialogAreas(areas, goals, [], [])).toEqual(areas);
  });

  it("keeps the area list constrained to selected goals even after an area is already selected", () => {
    expect(filterProjectDialogAreas(areas, goals, ["a1"], ["g1"])).toEqual([areas[0]]);
  });

  it("limits the area list to the selected goals' areas when no area is assigned yet", () => {
    expect(filterProjectDialogAreas(areas, goals, [], ["g2"])).toEqual([areas[1]]);
  });

  it("returns the union of related areas when multiple goals are selected", () => {
    expect(filterProjectDialogAreas(areas, goals, [], ["g1", "g2"])).toEqual([
      areas[0],
      areas[1],
    ]);
  });

  it("returns no assigned areas when the selected goals are unassigned", () => {
    expect(filterProjectDialogAreas(areas, goals, [], ["g3"])).toEqual([]);
  });
});
