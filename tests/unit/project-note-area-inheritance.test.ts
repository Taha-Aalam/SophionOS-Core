import { describe, expect, it } from "vitest";

import { getProjectLinkedAreaIds } from "../../src/lib/utils/projects";
import { getGoalLinkedAreaIds } from "../../src/lib/utils/goals";

/**
 * Regression tests for FIX 2:
 * When creating a note from a project or goal detail page the area_id
 * passed to NoteEditorDialog must use the deterministic rule:
 *   area_id (primary) if present, else first resolved linked area.
 * This is implemented by taking `projectLinkedAreaIds[0] ?? null`.
 */
describe("project-created note area inheritance", () => {
  it("uses primary area_id as the inherited area when it is set", () => {
    const project = { area_id: "area-primary", linkedAreaIds: ["area-extra"] };
    const areaId = getProjectLinkedAreaIds(project)[0] ?? null;
    expect(areaId).toBe("area-primary");
  });

  it("uses the first extra linked area when area_id is null", () => {
    const project = { area_id: null, linkedAreaIds: ["area-first", "area-second"] };
    const areaId = getProjectLinkedAreaIds(project)[0] ?? null;
    expect(areaId).toBe("area-first");
  });

  it("returns null when the project has no linked areas at all", () => {
    const project = { area_id: null, linkedAreaIds: [] };
    const areaId = getProjectLinkedAreaIds(project)[0] ?? null;
    expect(areaId).toBeNull();
  });

  it("deduplicates when area_id and linkedAreaIds overlap", () => {
    const project = { area_id: "a1", linkedAreaIds: ["a1", "a2"] };
    const ids = getProjectLinkedAreaIds(project);
    expect(ids).toEqual(["a1", "a2"]);
    expect(ids[0]).toBe("a1");
  });
});

describe("goal-created note area inheritance", () => {
  it("uses primary area_id as the inherited area when it is set", () => {
    const goal = { area_id: "goal-area-primary", linkedAreaIds: ["goal-area-extra"] };
    const areaId = getGoalLinkedAreaIds(goal)[0] ?? null;
    expect(areaId).toBe("goal-area-primary");
  });

  it("uses the first extra linked area when area_id is null", () => {
    const goal = { area_id: null, linkedAreaIds: ["ga-first", "ga-second"] };
    const areaId = getGoalLinkedAreaIds(goal)[0] ?? null;
    expect(areaId).toBe("ga-first");
  });

  it("returns null when the goal has no linked areas", () => {
    const goal = { area_id: null, linkedAreaIds: [] };
    const areaId = getGoalLinkedAreaIds(goal)[0] ?? null;
    expect(areaId).toBeNull();
  });
});
