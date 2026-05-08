import { describe, expect, it } from "vitest";

import {
  NOTES_EMPTY_VALUE,
  NOTES_LOADING_LABEL,
  NOTES_PAGE_SHELL_CLASS_NAME,
  NOTES_ROW_ACTION_BUTTON_CLASS_NAME,
  NOTES_SEARCH_PLACEHOLDER,
  NOTES_TABLE_WRAPPER_CLASS_NAME,
  NOTES_TABS_LIST_CLASS_NAME,
  formatNotesSummary,
  getNoteArchiveActionCopy,
} from "../../src/lib/utils/note-page-display";

describe("note page display helpers", () => {
  it("formats the notes summary with safe ASCII punctuation", () => {
    expect(formatNotesSummary(5, 0)).toBe("5 active notes - 0 archived");
    expect(formatNotesSummary(1, 2)).toBe("1 active note - 2 archived");
  });

  it("uses clean ASCII UI copy for placeholders and fallbacks", () => {
    expect(NOTES_SEARCH_PLACEHOLDER).toBe("Search...");
    expect(NOTES_LOADING_LABEL).toBe("Loading notes...");
    expect(NOTES_EMPTY_VALUE).toBe("-");
  });

  it("keeps the Notes page on the wide dashboard shell", () => {
    expect(NOTES_PAGE_SHELL_CLASS_NAME).toContain("p-6");
    expect(NOTES_PAGE_SHELL_CLASS_NAME).toContain("max-w-7xl");
    expect(NOTES_PAGE_SHELL_CLASS_NAME).toContain("mx-auto");
    expect(NOTES_PAGE_SHELL_CLASS_NAME).toContain("w-full");
  });

  it("uses visible archive row actions with explicit archive labels", () => {
    expect(NOTES_ROW_ACTION_BUTTON_CLASS_NAME).toContain("group-hover:opacity-100");
    expect(NOTES_ROW_ACTION_BUTTON_CLASS_NAME).toContain("group-focus-within:opacity-100");
    expect(NOTES_ROW_ACTION_BUTTON_CLASS_NAME).toContain("focus-visible:opacity-100");
    expect(getNoteArchiveActionCopy(false)).toBe("Archive");
    expect(getNoteArchiveActionCopy(true)).toBe("Restore");
  });

  it("keeps tabs on one line with local overflow containment", () => {
    expect(NOTES_TABS_LIST_CLASS_NAME).toContain("flex-nowrap");
    expect(NOTES_TABS_LIST_CLASS_NAME).toContain("overflow-x-auto");
    expect(NOTES_TABLE_WRAPPER_CLASS_NAME).toContain("overflow-x-auto");
  });
});
