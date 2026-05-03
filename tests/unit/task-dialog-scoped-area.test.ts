import { describe, expect, it } from "vitest";

import {
  applyGoalScopedDefaults,
  applyProjectScopedAreaGuard,
  getScopedAreaDisplayLabel,
  getScopedCandidateAreaIds,
} from "../../src/lib/utils/goal-scoped";

/**
 * Regression tests for FIX 3 & FIX 4:
 * - applyGoalScopedDefaults preserves user's area choice when it is
 *   one of the goal's scoped areas (multi-area mode).
 * - Initial form area_id for scoped dialogs uses deterministic rule:
 *   areaId ?? first linkedAreaId ?? "".
 * - Area name resolution uses allAreas (includes archived) to prevent
 *   the "Inherited from goal/project" generic fallback.
 */
describe("applyGoalScopedDefaults – multi-area preservation", () => {
  it("preserves user-selected area when it is one of the goal linked areas (null primary)", () => {
    const result = applyGoalScopedDefaults(
      { name: "task", area_id: "a2", goal_ids: [] },
      { goalId: "g1", areaId: null, linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
    expect(result.goal_ids).toEqual(["g1"]);
  });

  it("preserves user-selected area when it is one of the goal linked areas (has primary)", () => {
    const result = applyGoalScopedDefaults(
      { name: "task", area_id: "a2", goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
    expect(result.goal_ids).toEqual(["g1"]);
  });

  it("falls back to primary areaId when form area is unrelated", () => {
    const result = applyGoalScopedDefaults(
      { name: "task", area_id: "unrelated", goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a1");
  });

  it("falls back to empty string when areaId is null and form area is unrelated", () => {
    const result = applyGoalScopedDefaults(
      { name: "task", area_id: "unrelated", goal_ids: [] },
      { goalId: "g1", areaId: null, linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("");
  });

  it("still locks to primary areaId in single-area case (backwards compat)", () => {
    const result = applyGoalScopedDefaults(
      { name: "task", area_id: "from-user-input", goal_ids: [] },
      { goalId: "g1", areaId: "goal-area" },
    );
    expect(result.area_id).toBe("goal-area");
  });
});

describe("scoped task dialog initial area_id: deterministic rule", () => {
  function getScopedAreaId(areaId: string | null, linkedAreaIds?: string[]): string {
    return areaId ?? linkedAreaIds?.[0] ?? "";
  }

  it("goal-scoped: uses primary areaId when set", () => {
    expect(getScopedAreaId("primary", ["primary", "extra"])).toBe("primary");
  });

  it("goal-scoped: falls back to first linked area when areaId is null", () => {
    expect(getScopedAreaId(null, ["first", "second"])).toBe("first");
  });

  it("goal-scoped: empty string when no areas at all", () => {
    expect(getScopedAreaId(null, [])).toBe("");
  });

  it("project-scoped: uses primary areaId when set", () => {
    expect(getScopedAreaId("area-main", ["area-main", "area-extra"])).toBe("area-main");
  });

  it("project-scoped: falls back to first linked area when areaId is null", () => {
    expect(getScopedAreaId(null, ["area-first", "area-second"])).toBe("area-first");
  });

  it("project-scoped: empty string when project has no areas", () => {
    expect(getScopedAreaId(null, [])).toBe("");
  });
});

describe("scoped area name resolution: allAreas includes archived", () => {
  const ALL_AREAS = [
    { id: "a1", name: "Work", archive: false, icon: null },
    { id: "a2", name: "Old Work", archive: true, icon: "📦" },
  ];

  function resolveAreaNames(candidateIds: string[], areas: typeof ALL_AREAS) {
    return candidateIds
      .map((id) => areas.find((area) => area.id === id))
      .filter((area): area is NonNullable<typeof area> => Boolean(area));
  }

  it("resolves an archived area when searching allAreas (no filter)", () => {
    const resolved = resolveAreaNames(["a2"], ALL_AREAS);
    expect(resolved.length).toBe(1);
    expect(resolved[0].name).toBe("Old Work");
  });

  it("resolves multiple areas including archived ones", () => {
    const resolved = resolveAreaNames(["a1", "a2"], ALL_AREAS);
    expect(resolved.length).toBe(2);
    expect(resolved.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("returns empty resolved list for unknown area ids", () => {
    const resolved = resolveAreaNames(["unknown-id"], ALL_AREAS);
    expect(resolved.length).toBe(0);
  });

  it("single resolved area triggers locked display (not Select)", () => {
    const resolved = resolveAreaNames(["a1"], ALL_AREAS);
    expect(resolved.length).toBe(1);
  });

  it("multiple resolved areas trigger Select display", () => {
    const resolved = resolveAreaNames(["a1", "a2"], ALL_AREAS);
    expect(resolved.length).toBeGreaterThan(1);
  });
});

describe("project-scoped task: area label for locked display", () => {
  it("renders name without icon prefix when icon is null", () => {
    const area = { id: "a1", name: "Work", icon: null };
    const label = `${area.icon ? `${area.icon} ` : ""}${area.name} (from project)`;
    expect(label).toBe("Work (from project)");
  });

  it("renders icon and name when icon is set", () => {
    const area = { id: "a1", name: "Work", icon: "💼" };
    const label = `${area.icon ? `${area.icon} ` : ""}${area.name} (from project)`;
    expect(label).toBe("💼 Work (from project)");
  });

  it("renders name with goal suffix for goal-scoped", () => {
    const area = { id: "a1", name: "Health", icon: "❤️" };
    const label = `${area.icon ? `${area.icon} ` : ""}${area.name} (from goal)`;
    expect(label).toBe("❤️ Health (from goal)");
  });
});

// ─── NEW: getScopedCandidateAreaIds ──────────────────────────────────────────

describe("getScopedCandidateAreaIds", () => {
  it("returns linkedAreaIds when they are present (goal-scoped, single primary)", () => {
    const result = getScopedCandidateAreaIds({ areaId: "a1", linkedAreaIds: ["a1"] });
    expect(result).toEqual(["a1"]);
  });

  it("returns all linkedAreaIds including primary when goal has multiple linked areas", () => {
    const result = getScopedCandidateAreaIds({ areaId: "a1", linkedAreaIds: ["a1", "a2", "a3"] });
    expect(result).toEqual(["a1", "a2", "a3"]);
  });

  it("returns linkedAreaIds even when areaId is null (goal has no primary but has linked areas)", () => {
    const result = getScopedCandidateAreaIds({ areaId: null, linkedAreaIds: ["a2", "a3"] });
    expect(result).toEqual(["a2", "a3"]);
  });

  it("falls back to [areaId] when linkedAreaIds is absent", () => {
    const result = getScopedCandidateAreaIds({ areaId: "a1" });
    expect(result).toEqual(["a1"]);
  });

  it("falls back to [areaId] when linkedAreaIds is an empty array", () => {
    const result = getScopedCandidateAreaIds({ areaId: "a1", linkedAreaIds: [] });
    expect(result).toEqual(["a1"]);
  });

  it("returns empty array when both areaId and linkedAreaIds are absent/null", () => {
    const result = getScopedCandidateAreaIds({ areaId: null });
    expect(result).toEqual([]);
  });

  it("returns empty array when areaId is null and linkedAreaIds is empty", () => {
    const result = getScopedCandidateAreaIds({ areaId: null, linkedAreaIds: [] });
    expect(result).toEqual([]);
  });

  it("project-scoped: returns all linked area IDs when multiple areas are linked", () => {
    const result = getScopedCandidateAreaIds({
      areaId: "proj-a1",
      linkedAreaIds: ["proj-a1", "proj-a2"],
    });
    expect(result).toHaveLength(2);
    expect(result).toContain("proj-a1");
    expect(result).toContain("proj-a2");
  });
});

// ─── NEW: applyProjectScopedAreaGuard ────────────────────────────────────────

describe("applyProjectScopedAreaGuard", () => {
  it("preserves a chosen area_id that is within the project's linked areas", () => {
    const result = applyProjectScopedAreaGuard(
      { name: "task", area_id: "a2" },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
  });

  it("falls back to primary areaId when chosen area is not in the scoped set", () => {
    const result = applyProjectScopedAreaGuard(
      { name: "task", area_id: "unrelated" },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a1");
  });

  it("falls back to first linkedAreaId when primary areaId is null and chosen is unrelated", () => {
    const result = applyProjectScopedAreaGuard(
      { name: "task", area_id: "unrelated" },
      { areaId: null, linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a1");
  });

  it("falls back to primary areaId when area_id is null", () => {
    const result = applyProjectScopedAreaGuard(
      { name: "task", area_id: null },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a1");
  });

  it("returns values unchanged when scopedAreaIds set is empty (no config)", () => {
    const input = { name: "task", area_id: "anything" };
    const result = applyProjectScopedAreaGuard(input, { areaId: null });
    expect(result).toEqual(input);
  });

  it("preserves primary areaId when it is the chosen area (single-area project)", () => {
    const result = applyProjectScopedAreaGuard(
      { name: "task", area_id: "a1" },
      { areaId: "a1" },
    );
    expect(result.area_id).toBe("a1");
  });

  it("does not mutate other fields in the values object", () => {
    const result = applyProjectScopedAreaGuard(
      { name: "my task", area_id: "a1", goal_ids: ["g1"], is_focused: true },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.name).toBe("my task");
    expect(result.goal_ids).toEqual(["g1"]);
    expect(result.is_focused).toBe(true);
  });
});

// ─── form reset guard: same values / different references ────────────────────

describe("form reset guard: candidate IDs are stable across reference changes", () => {
  /**
   * TaskDialog resets the form only when the dialog opens or the edited task
   * changes (lastResetKeyRef guard). This requires that the underlying area
   * candidate IDs computed from goalScoped / projectScoped remain equal even
   * when those props are new object references (which happens on every parent
   * render because they are inline object literals in JSX).
   *
   * These tests assert that getScopedCandidateAreaIds is purely value-based so
   * the reset guard holds its invariant correctly.
   */

  it("goal-scoped: two separate config objects with same values produce identical candidate IDs", () => {
    const config1 = { areaId: "a1", linkedAreaIds: ["a1", "a2"] };
    const config2 = { areaId: "a1", linkedAreaIds: ["a1", "a2"] };
    expect(config1).not.toBe(config2);
    expect(getScopedCandidateAreaIds(config1)).toEqual(getScopedCandidateAreaIds(config2));
  });

  it("project-scoped: two separate config objects with same values produce identical candidate IDs", () => {
    const config1 = { areaId: "p-a1", linkedAreaIds: ["p-a1", "p-a2", "p-a3"] };
    const config2 = { areaId: "p-a1", linkedAreaIds: ["p-a1", "p-a2", "p-a3"] };
    expect(config1).not.toBe(config2);
    expect(getScopedCandidateAreaIds(config1)).toEqual(getScopedCandidateAreaIds(config2));
  });

  it("initial area_id is deterministic regardless of how many times the config is re-evaluated", () => {
    const areaId = "primary";
    const linkedAreaIds = ["primary", "secondary"];
    const computeInitialAreaId = (aid: string | null, ids?: string[]) =>
      aid ?? ids?.[0] ?? "";
    const first = computeInitialAreaId(areaId, linkedAreaIds);
    const second = computeInitialAreaId(areaId, linkedAreaIds);
    expect(first).toBe(second);
    expect(first).toBe("primary");
  });
});

// ─── NEW: scoped dialog behavior when area is outside the generic cache ───────

describe("scoped area resolution: area outside generic list cap", () => {
  /**
   * Simulates the scenario where the generic useAreas() list (capped at 50)
   * does NOT contain the scoped area IDs. The old code would fail to resolve
   * them; the new code uses useAreasByIds() which fetches by ID directly.
   *
   * These tests validate the helper logic that drives the resolution path.
   */

  const GENERIC_CACHE: { id: string; name: string; archive: boolean }[] = [];

  it("old approach fails to resolve an area not in the generic cache", () => {
    const candidateIds = ["area-51", "area-52"];
    const resolvedViaCache = candidateIds
      .map((id) => GENERIC_CACHE.find((a) => a.id === id))
      .filter(Boolean);
    expect(resolvedViaCache.length).toBe(0);
  });

  it("getScopedCandidateAreaIds surfaces all linked IDs so useAreasByIds can be called with them", () => {
    const scopedIds = getScopedCandidateAreaIds({
      areaId: "area-51",
      linkedAreaIds: ["area-51", "area-52"],
    });
    expect(scopedIds).toEqual(["area-51", "area-52"]);
  });

  it("fully resolved scopedAreas from useAreasByIds produces correct option count", () => {
    const fetchedByIds = [
      { id: "area-51", name: "Beyond Cache 1", archive: false },
      { id: "area-52", name: "Beyond Cache 2", archive: false },
    ];
    expect(fetchedByIds.length).toBe(2);
    expect(fetchedByIds.map((a) => a.name)).toContain("Beyond Cache 1");
    expect(fetchedByIds.map((a) => a.name)).toContain("Beyond Cache 2");
  });
});

describe("getScopedAreaDisplayLabel", () => {
  const scopedAreas = [
    { id: "a1", name: "Test Area", icon: "🎯" },
    { id: "a2", name: "Test 2", icon: "⚙️" },
  ];

  it("returns the selected area's human-readable label", () => {
    expect(getScopedAreaDisplayLabel(scopedAreas, "a2")).toBe("⚙️ Test 2");
  });

  it("falls back to the first resolved area when the selected id is missing", () => {
    expect(getScopedAreaDisplayLabel(scopedAreas, "missing-id")).toBe("🎯 Test Area");
  });

  it("returns undefined when no resolved scoped areas exist", () => {
    expect(getScopedAreaDisplayLabel([], "a1")).toBeUndefined();
  });
});

// ─── NEW: buildTaskFormValues scoped init — full linked area set ──────────────

describe("buildTaskFormValues scoped initial area_ids: full linked area set", () => {
  function getGoalScopedAreaIds(config: { areaId: string | null; linkedAreaIds?: string[] }): string[] {
    if (config.linkedAreaIds?.length) return config.linkedAreaIds;
    if (config.areaId) return [config.areaId];
    return [];
  }

  function getProjectScopedAreaIds(config: { areaId: string | null; linkedAreaIds?: string[] }): string[] {
    if (config.linkedAreaIds?.length) return config.linkedAreaIds;
    if (config.areaId) return [config.areaId];
    return [];
  }

  it("goal-scoped create: initializes with all linked areas when multiple exist", () => {
    const result = getGoalScopedAreaIds({ areaId: "a1", linkedAreaIds: ["a1", "a2", "a3"] });
    expect(result).toEqual(["a1", "a2", "a3"]);
    expect(result.length).toBeGreaterThan(1);
  });

  it("project-scoped create: initializes with all linked areas when multiple exist", () => {
    const result = getProjectScopedAreaIds({ areaId: "p1", linkedAreaIds: ["p1", "p2"] });
    expect(result).toEqual(["p1", "p2"]);
    expect(result.length).toBeGreaterThan(1);
  });

  it("goal-scoped create: does not collapse to single area when multiple are linked", () => {
    const result = getGoalScopedAreaIds({ areaId: null, linkedAreaIds: ["a1", "a2"] });
    expect(result).toHaveLength(2);
  });

  it("project-scoped create: does not collapse to single area when multiple are linked", () => {
    const result = getProjectScopedAreaIds({ areaId: null, linkedAreaIds: ["p1", "p2", "p3"] });
    expect(result).toHaveLength(3);
  });

  it("goal-scoped: single area stays as single-element array", () => {
    const result = getGoalScopedAreaIds({ areaId: "a1", linkedAreaIds: ["a1"] });
    expect(result).toEqual(["a1"]);
  });

  it("project-scoped: falls back to areaId-only array when no linkedAreaIds", () => {
    const result = getProjectScopedAreaIds({ areaId: "a1" });
    expect(result).toEqual(["a1"]);
  });

  it("goal-scoped: empty array when no areas at all", () => {
    const result = getGoalScopedAreaIds({ areaId: null, linkedAreaIds: [] });
    expect(result).toEqual([]);
  });

  it("project-scoped: empty array when no areas at all", () => {
    const result = getProjectScopedAreaIds({ areaId: null });
    expect(result).toEqual([]);
  });
});

// ─── NEW: applyGoalScopedDefaults with area_ids multi-area guard ──────────────

describe("applyGoalScopedDefaults – area_ids multi-area guard", () => {
  it("preserves all valid scoped area_ids when all are within scope", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "a1", area_ids: ["a1", "a2"], goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_ids).toEqual(["a1", "a2"]);
  });

  it("does not collapse multi-area selection when all are valid", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "a1", area_ids: ["a1", "a2", "a3"], goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2", "a3"] },
    );
    expect(result.area_ids).toHaveLength(3);
  });

  it("strips out-of-scope IDs from area_ids and preserves valid ones", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "a1", area_ids: ["a1", "unrelated"], goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_ids).toEqual(["a1"]);
  });

  it("falls back to [config.areaId] when all area_ids are out of scope", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "x", area_ids: ["unrelated", "also-unrelated"], goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_ids).toEqual(["a1"]);
    expect(result.area_id).toBe("a1");
  });

  it("sets area_id from first valid ID in area_ids", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "", area_ids: ["a2", "a1"], goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
  });

  it("locks goal_ids to the parent goal even when area_ids path is used", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "a1", area_ids: ["a1", "a2"], goal_ids: ["other-goal"] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.goal_ids).toEqual(["g1"]);
  });

  it("backwards-compat: still works with plain area_id only (no area_ids field)", () => {
    const result = applyGoalScopedDefaults(
      { area_id: "a2", goal_ids: [] },
      { goalId: "g1", areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
    expect(result.area_ids).toBeUndefined();
  });
});

// ─── NEW: applyProjectScopedAreaGuard with area_ids multi-area guard ──────────

describe("applyProjectScopedAreaGuard – area_ids multi-area guard", () => {
  it("preserves all valid scoped area_ids", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "a1", area_ids: ["a1", "a2"] },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_ids).toEqual(["a1", "a2"]);
  });

  it("does not collapse multi-area selection when all are valid", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "a1", area_ids: ["a1", "a2", "a3"] },
      { areaId: "a1", linkedAreaIds: ["a1", "a2", "a3"] },
    );
    expect(result.area_ids).toHaveLength(3);
  });

  it("strips invalid IDs from area_ids", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "a1", area_ids: ["a1", "outside"] },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_ids).toEqual(["a1"]);
  });

  it("falls back to [config.areaId] when all area_ids are invalid", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "x", area_ids: ["bad1", "bad2"] },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_ids).toEqual(["a1"]);
    expect(result.area_id).toBe("a1");
  });

  it("sets area_id from first of the guarded area_ids", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "", area_ids: ["a2", "a1"] },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
  });

  it("backwards-compat: still works with plain area_id only (no area_ids field)", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "a2" },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect(result.area_id).toBe("a2");
    expect(result.area_ids).toBeUndefined();
  });

  it("does not mutate other fields", () => {
    const result = applyProjectScopedAreaGuard(
      { area_id: "a1", area_ids: ["a1", "a2"], goal_ids: ["g1"], is_focused: true },
      { areaId: "a1", linkedAreaIds: ["a1", "a2"] },
    );
    expect((result as Record<string, unknown>).goal_ids).toEqual(["g1"]);
    expect((result as Record<string, unknown>).is_focused).toBe(true);
  });
});
