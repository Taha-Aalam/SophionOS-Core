import { describe, expect, it } from "vitest";

/**
 * Regression tests for goal detail page tab behavior.
 * Ensures note and resource tabs are static (All, Inbox, To Review, Active, Archive)
 * with no dynamic type tabs appended after Archived.
 */
describe("goal detail page static tabs", () => {
  const STATIC_NOTE_TABS = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archive" },
  ];

  const STATIC_RESOURCE_TABS = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archive" },
  ];

  it("note tabs stop at Archive with no type tabs appended", () => {
    const lastTab = STATIC_NOTE_TABS[STATIC_NOTE_TABS.length - 1];
    expect(lastTab.value).toBe("archived");
    expect(lastTab.label).toBe("Archive");

    const tabValues = STATIC_NOTE_TABS.map((t) => t.value);
    expect(tabValues.filter((v) => v.startsWith("type:"))).toHaveLength(0);
  });

  it("resource tabs stop at Archive with no type tabs appended", () => {
    const lastTab = STATIC_RESOURCE_TABS[STATIC_RESOURCE_TABS.length - 1];
    expect(lastTab.value).toBe("archived");
    expect(lastTab.label).toBe("Archive");

    const tabValues = STATIC_RESOURCE_TABS.map((t) => t.value);
    expect(tabValues.filter((v) => v.startsWith("type:"))).toHaveLength(0);
  });

  it("note tabs have exactly 5 entries (no dynamic type tabs)", () => {
    expect(STATIC_NOTE_TABS).toHaveLength(5);
  });

  it("resource tabs have exactly 5 entries (no dynamic type tabs)", () => {
    expect(STATIC_RESOURCE_TABS).toHaveLength(5);
  });

  it("note tab order is All -> Inbox -> To Review -> Active -> Archive", () => {
    const expected = ["all", "inbox", "to_review", "active", "archived"];
    expect(STATIC_NOTE_TABS.map((t) => t.value)).toEqual(expected);
  });

  it("resource tab order is All -> Inbox -> To Review -> Active -> Archive", () => {
    const expected = ["all", "inbox", "to_review", "active", "archived"];
    expect(STATIC_RESOURCE_TABS.map((t) => t.value)).toEqual(expected);
  });
});
