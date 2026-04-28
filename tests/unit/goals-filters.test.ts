import { describe, expect, it } from "vitest";

import {
  calculateGoalProgress,
  getGoalFiltersForView,
  getGoalViewFromFilters,
  goalMatchesFilters,
  mergeGoalIntoFilteredList,
} from "../../src/lib/utils/goals";

describe("goal view filters", () => {
  it("maps roadmap tabs to the correct query filters", () => {
    expect(getGoalFiltersForView("active")).toEqual({
      status: "active",
      term: "all",
    });
    expect(getGoalFiltersForView("short")).toEqual({
      status: "active",
      term: "short",
    });
    expect(getGoalFiltersForView("mid")).toEqual({
      status: "active",
      term: "mid",
    });
    expect(getGoalFiltersForView("long")).toEqual({
      status: "active",
      term: "long",
    });
    expect(getGoalFiltersForView("inactive")).toEqual({
      status: "inactive",
      term: "all",
    });
    expect(getGoalFiltersForView("completed")).toEqual({
      status: "completed",
      term: "all",
    });
  });

  it("derives the active tab from persisted goal filters", () => {
    expect(getGoalViewFromFilters({ status: "active", term: "all" })).toBe("active");
    expect(getGoalViewFromFilters({ status: "active", term: "short" })).toBe("short");
    expect(getGoalViewFromFilters({ status: "active", term: "mid" })).toBe("mid");
    expect(getGoalViewFromFilters({ status: "active", term: "long" })).toBe("long");
    expect(getGoalViewFromFilters({ status: "inactive", term: "all" })).toBe("inactive");
    expect(getGoalViewFromFilters({ status: "archived", term: "all" })).toBe("inactive");
    expect(getGoalViewFromFilters({ status: "completed", term: "all" })).toBe("completed");
  });

  it("removes archived and completed goals from the active view immediately", () => {
    const activeGoal = {
      id: "goal-1",
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      is_archived: false,
      is_completed: false,
      name: "Goal 1",
      priority: "medium",
      progress: 0,
      slug: "goal-1",
      target_date: null,
      term: "short",
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: "user-1",
    } as const;

    expect(goalMatchesFilters(activeGoal, { status: "active" })).toBe(true);
    expect(
      mergeGoalIntoFilteredList(
        [activeGoal],
        { ...activeGoal, is_archived: true },
        { status: "active" },
      ),
    ).toEqual([]);
    expect(
      mergeGoalIntoFilteredList(
        [activeGoal],
        { ...activeGoal, is_completed: true, progress: 100 },
        { status: "active" },
      ),
    ).toEqual([]);
  });

  it("adds a completed goal into the completed view when its status changes", () => {
    const completedGoal = {
      id: "goal-2",
      area_id: null,
      created_at: "2026-04-29T10:00:00.000Z",
      description: null,
      is_archived: false,
      is_completed: true,
      name: "Goal 2",
      priority: "medium",
      progress: 100,
      slug: "goal-2",
      target_date: null,
      term: "mid",
      updated_at: "2026-04-29T10:00:00.000Z",
      user_id: "user-1",
    } as const;

    expect(
      mergeGoalIntoFilteredList([], completedGoal, { status: "completed" }),
    ).toEqual([completedGoal]);
  });

  it("derives goal progress from linked projects before falling back to persisted progress", () => {
    expect(
      calculateGoalProgress(
        { is_completed: false, progress: 100 },
        [
          { is_archived: false, status: "active" },
          { is_archived: false, status: "completed" },
        ],
        [],
      ),
    ).toBe(50);
  });

  it("falls back to linked task completion when there are no linked projects", () => {
    expect(
      calculateGoalProgress(
        { is_completed: false, progress: 80 },
        [],
        [
          { is_archived: false, is_completed: true },
          { is_archived: false, is_completed: false },
          { is_archived: true, is_completed: true },
        ],
      ),
    ).toBe(50);
  });
});
