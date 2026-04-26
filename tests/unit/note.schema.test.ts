import { describe, expect, it } from "vitest";

import { NOTE_STATUS, NOTE_TYPE } from "../../src/lib/utils/constants";
import { createNoteSchema, updateNoteSchema } from "../../src/lib/validators/note.schema";

describe("createNoteSchema", () => {
  it("accepts minimal valid input with defaults applied", () => {
    const result = createNoteSchema.parse({ name: "My note" });

    expect(result).toMatchObject({
      name: "My note",
      type: NOTE_TYPE.NOTE,
      status: NOTE_STATUS.INBOX,
      favorite: false,
      pin: false,
      is_archived: false,
    });
  });

  it("accepts all valid fields", () => {
    const result = createNoteSchema.parse({
      name: "Research note",
      content: '{"type":"doc","content":[]}',
      type: NOTE_TYPE.RESEARCH,
      status: NOTE_STATUS.ACTIVE,
      notebook: "Ideas",
      area_id: "11111111-1111-4111-8111-111111111111",
      project_id: "22222222-2222-4222-8222-222222222222",
      favorite: true,
      pin: true,
      is_archived: false,
    });

    expect(result.name).toBe("Research note");
    expect(result.type).toBe(NOTE_TYPE.RESEARCH);
    expect(result.status).toBe(NOTE_STATUS.ACTIVE);
    expect(result.notebook).toBe("Ideas");
    expect(result.favorite).toBe(true);
  });

  it("normalizes empty area_id and project_id to null", () => {
    const result = createNoteSchema.parse({
      name: "Note",
      area_id: "",
      project_id: "",
    });

    expect(result.area_id).toBeNull();
    expect(result.project_id).toBeNull();
  });

  it("rejects empty name", () => {
    expect(() => createNoteSchema.parse({ name: "" })).toThrow();
  });

  it("rejects invalid note type", () => {
    expect(() =>
      createNoteSchema.parse({ name: "Note", type: "invalid" }),
    ).toThrow();
  });

  it("rejects invalid note status", () => {
    expect(() =>
      createNoteSchema.parse({ name: "Note", status: "done" }),
    ).toThrow();
  });

  it("rejects invalid area_id UUID", () => {
    expect(() =>
      createNoteSchema.parse({ name: "Note", area_id: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects unexpected fields (strict)", () => {
    expect(() =>
      createNoteSchema.parse({ name: "Note", unexpectedField: true }),
    ).toThrow();
  });
});

describe("updateNoteSchema", () => {
  it("accepts partial update with only status", () => {
    const result = updateNoteSchema.parse({ status: NOTE_STATUS.TO_REVIEW });
    expect(result.status).toBe(NOTE_STATUS.TO_REVIEW);
  });

  it("accepts favorite toggle", () => {
    const result = updateNoteSchema.parse({ favorite: true });
    expect(result.favorite).toBe(true);
  });

  it("accepts notebook update", () => {
    const result = updateNoteSchema.parse({ notebook: "Work" });
    expect(result.notebook).toBe("Work");
  });

  it("rejects unknown fields", () => {
    expect(() =>
      updateNoteSchema.parse({ status: NOTE_STATUS.ACTIVE, unknownKey: "x" }),
    ).toThrow();
  });
});
