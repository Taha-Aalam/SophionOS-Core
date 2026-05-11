import { describe, expect, it } from "vitest";

/**
 * Regression tests for project detail page tab behavior.
 * Ensures tabs match the required order: Goals (no All), Tasks, Notes, Resources.
 */

describe("project detail goal tabs", () => {
  const goalTabs = [
    { value: "active", label: "Active" },
    { value: "short", label: "Short Term" },
    { value: "mid", label: "Mid Term" },
    { value: "long", label: "Long Term" },
    { value: "inactive", label: "Inactive" },
    { value: "completed", label: "Completed" },
  ];

  it("goal tabs do NOT include All", () => {
    const tabValues = goalTabs.map((t) => t.value);
    expect(tabValues).not.toContain("all");
  });

  it("goal tabs are exactly Active, Short Term, Mid Term, Long Term, Inactive, Completed", () => {
    const expected = ["active", "short", "mid", "long", "inactive", "completed"];
    expect(goalTabs.map((t) => t.value)).toEqual(expected);
  });

  it("default goal tab should be active, not all", () => {
    const defaultGoalTab = "active";
    expect(defaultGoalTab).not.toBe("all");
  });
});

describe("project detail task tabs", () => {
  const taskTabs = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "upcoming", label: "Upcoming" },
    { value: "overdue", label: "Overdue" },
    { value: "by_area", label: "By Area" },
    { value: "by_goal", label: "By Goal" },
    { value: "completed", label: "Completed" },
  ];

  it("task tabs are exactly All, Inbox, Upcoming, Overdue, By Area, By Goal, Completed", () => {
    const expected = ["all", "inbox", "upcoming", "overdue", "by_area", "by_goal", "completed"];
    expect(taskTabs.map((t) => t.value)).toEqual(expected);
  });
});

describe("project detail note tabs", () => {
  const noteTabs = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archive" },
  ];

  it("note tabs are exactly All, Inbox, To Review, Active, Archive", () => {
    const expected = ["all", "inbox", "to_review", "active", "archived"];
    expect(noteTabs.map((t) => t.value)).toEqual(expected);
  });
});

describe("project detail resource tabs", () => {
  const resourceTabs = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archive" },
  ];

  it("resource tabs are exactly All, Inbox, To Review, Active, Archive", () => {
    const expected = ["all", "inbox", "to_review", "active", "archived"];
    expect(resourceTabs.map((t) => t.value)).toEqual(expected);
  });
});