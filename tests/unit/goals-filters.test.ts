import { describe, expect, it } from "vitest";

import {
  getGoalFiltersForView,
  getGoalViewFromFilters,
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
});
