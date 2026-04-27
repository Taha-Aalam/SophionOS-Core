import { describe, expect, it } from "vitest";

import {
  buildGoalDetailHref,
  getGoalSlug,
  resolveGoalBySlug,
} from "../../src/lib/utils/goal-urls";
import { Goal } from "../../src/lib/types/domain.types";

const makeGoal = (name: string, slug?: string): Goal =>
  ({
    id: "goal-uuid-1",
    user_id: "user-1",
    name,
    slug,
    term: "short",
    priority: "medium",
    progress: 0,
    is_completed: false,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as Goal;

describe("goal-urls", () => {
  describe("buildGoalDetailHref", () => {
    it("uses explicit slug when available", () => {
      const goal = makeGoal("Step 20", "step-20-command-center");
      expect(buildGoalDetailHref(goal)).toBe("/goals/step-20-command-center");
    });

    it("generates slug from name when slug is absent", () => {
      const goal = makeGoal("My Important Goal");
      expect(buildGoalDetailHref(goal)).toBe("/goals/my-important-goal");
    });
  });

  describe("getGoalSlug", () => {
    it("normalizes name to lowercase hyphenated slug", () => {
      expect(getGoalSlug("Step 20 Command Center")).toBe("step-20-command-center");
    });

    it("strips special characters", () => {
      expect(getGoalSlug("Test (2026)!")).toBe("test-2026");
    });
  });

  describe("resolveGoalBySlug", () => {
    it("returns matching goal when slug matches explicitly", () => {
      const goals = [makeGoal("First", "test-goal"), makeGoal("Second", "test-goal-1")];
      expect(resolveGoalBySlug(goals, "test-goal")).toBe(goals[0]);
    });

    it("returns matching goal when slug is absent and generated slug matches", () => {
      const goals = [
        makeGoal("Step 20", undefined), // slug absent — will generate "step-20"
      ];
      expect(resolveGoalBySlug(goals, "step-20")).toBe(goals[0]);
    });

    it("returns undefined when no goal matches the slug", () => {
      const goals = [makeGoal("Unique Name", "unique-slug")];
      expect(resolveGoalBySlug(goals, "nonexistent-slug")).toBeUndefined();
    });
  });
});