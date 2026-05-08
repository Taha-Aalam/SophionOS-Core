import { describe, expect, it } from "vitest";

import {
  buildSlug,
  dedupeAreaIds,
  extractGoalIds,
  extractNoteAreaIds,
  extractTaskIds,
  isMissingNoteAreasTableError,
  isMissingTaskNotesTableError,
  isValidUUID,
  normalizeTypeSlug,
} from "../../src/lib/services/note.helpers";

describe("isValidUUID", () => {
  it("accepts valid UUID v4", () => {
    expect(isValidUUID("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("accepts uppercase UUID", () => {
    expect(isValidUUID("11111111-1111-4111-8111-111111111111".toUpperCase())).toBe(true);
  });

  it("rejects invalid UUID", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUUID("")).toBe(false);
  });
});

describe("buildSlug", () => {
  it("converts name to lowercase slug", () => {
    expect(buildSlug("Hello World")).toBe("hello-world");
  });

  it("handles special characters", () => {
    expect(buildSlug("Note: Special & Important!")).toBe("note-special-important");
  });

  it("handles multiple spaces", () => {
    expect(buildSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });

  it("handles empty string", () => {
    expect(buildSlug("")).toBe("note");
  });

  it("handles leading/trailing hyphens", () => {
    expect(buildSlug("-hello-")).toBe("hello");
  });
});

describe("normalizeTypeSlug", () => {
  it("converts type name to lowercase slug", () => {
    expect(normalizeTypeSlug("Meeting Notes")).toBe("meeting-notes");
  });

  it("handles special characters", () => {
    expect(normalizeTypeSlug("Research & Development")).toBe("research-development");
  });

  it("trims whitespace", () => {
    expect(normalizeTypeSlug("  Journal Entry  ")).toBe("journal-entry");
  });

  it("handles empty string", () => {
    expect(normalizeTypeSlug("")).toBe("");
  });
});

describe("dedupeAreaIds", () => {
  it("removes duplicates", () => {
    expect(dedupeAreaIds(["a", "b", "a"])).toEqual(["a", "b"]);
  });

  it("filters null/undefined values", () => {
    expect(dedupeAreaIds(["a", null, undefined, "b"])).toEqual(["a", "b"]);
  });

  it("returns empty array for all null/undefined", () => {
    expect(dedupeAreaIds([null, undefined, null])).toEqual([]);
  });
});

describe("extractNoteAreaIds", () => {
  it("extracts area_ids and sets primary area_id to first element", () => {
    const { areaIds, noteInput } = extractNoteAreaIds({
      area_ids: ["a1", "a2"],
      name: "Note",
    });

    expect(areaIds).toEqual(["a1", "a2"]);
    expect(noteInput.area_id).toBe("a1");
    expect(noteInput).not.toHaveProperty("area_ids");
  });

  it("deduplicates area_ids", () => {
    const { areaIds } = extractNoteAreaIds({
      area_ids: ["a1", "a1", "a2"],
    });

    expect(areaIds).toEqual(["a1", "a2"]);
  });

  it("falls back to single area_id when area_ids not provided", () => {
    const { areaIds, noteInput } = extractNoteAreaIds({
      area_id: "a1",
      name: "Note",
    });

    expect(areaIds).toEqual(["a1"]);
    expect(noteInput.area_id).toBe("a1");
  });

  it("returns undefined areaIds when neither area_ids nor area_id provided", () => {
    const { areaIds, noteInput } = extractNoteAreaIds({ name: "Note" });

    expect(areaIds).toBeUndefined();
    expect(noteInput).not.toHaveProperty("area_ids");
  });

  it("handles null area_id", () => {
    const { areaIds, noteInput } = extractNoteAreaIds({ area_id: null });

    expect(areaIds).toBeUndefined();
    expect(noteInput.area_id).toBeNull();
  });
});

describe("extractGoalIds", () => {
  it("extracts goal_ids array", () => {
    const { goalIds, noteInput } = extractGoalIds({
      goal_ids: ["g1", "g2"],
      name: "Note",
    });

    expect(goalIds).toEqual(["g1", "g2"]);
    expect(noteInput).not.toHaveProperty("goal_ids");
  });

  it("deduplicates goal_ids", () => {
    const { goalIds } = extractGoalIds({
      goal_ids: ["g1", "g1", "g2"],
    });

    expect(goalIds).toEqual(["g1", "g2"]);
  });

  it("returns undefined when goal_ids not provided", () => {
    const { goalIds, noteInput } = extractGoalIds({ name: "Note" });

    expect(goalIds).toBeUndefined();
    expect(noteInput).not.toHaveProperty("goal_ids");
  });
});

describe("extractTaskIds", () => {
  it("extracts task_ids array", () => {
    const { taskIds, noteInput } = extractTaskIds({
      task_ids: ["t1", "t2"],
      name: "Note",
    });

    expect(taskIds).toEqual(["t1", "t2"]);
    expect(noteInput).not.toHaveProperty("task_ids");
  });

  it("deduplicates task_ids", () => {
    const { taskIds } = extractTaskIds({
      task_ids: ["t1", "t1", "t2"],
    });

    expect(taskIds).toEqual(["t1", "t2"]);
  });

  it("returns undefined when task_ids not provided", () => {
    const { taskIds, noteInput } = extractTaskIds({ name: "Note" });

    expect(taskIds).toBeUndefined();
    expect(noteInput).not.toHaveProperty("task_ids");
  });
});

describe("isMissingNoteAreasTableError", () => {
  it("detects PostgreSQL table missing error", () => {
    expect(isMissingNoteAreasTableError({ code: "42P01" })).toBe(true);
  });

  it("detects message about missing note_areas table", () => {
    expect(isMissingNoteAreasTableError({
      message: 'relation "note_areas" does not exist',
    })).toBe(true);
  });

  it("handles null error", () => {
    expect(isMissingNoteAreasTableError(null)).toBe(false);
  });

  it("handles non-matching error", () => {
    expect(isMissingNoteAreasTableError({ code: "23505" })).toBe(false);
  });

  it("handles string error", () => {
    expect(isMissingNoteAreasTableError("some error")).toBe(false);
  });
});

describe("isMissingTaskNotesTableError", () => {
  it("detects PostgreSQL table missing error", () => {
    expect(isMissingTaskNotesTableError({ code: "42P01" })).toBe(true);
  });

  it("detects message about missing task_notes table", () => {
    expect(isMissingTaskNotesTableError({
      message: 'relation "task_notes" does not exist',
    })).toBe(true);
  });

  it("handles null error", () => {
    expect(isMissingTaskNotesTableError(null)).toBe(false);
  });

  it("handles non-matching error", () => {
    expect(isMissingTaskNotesTableError({ code: "23505" })).toBe(false);
  });
});
