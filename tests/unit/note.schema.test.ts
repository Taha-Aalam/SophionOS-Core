import { describe, expect, it } from "vitest";

import { NOTE_STATUS, NOTE_TYPE } from "../../src/lib/utils/constants";
import { createNoteSchema, updateNoteSchema } from "../../src/lib/validators/note.schema";

describe("createNoteSchema", () => {
  it("accepts minimal valid input with defaults applied", () => {
    const result = createNoteSchema.parse({ name: "My note" });

    expect(result).toMatchObject({
      name: "My note",
      type: NOTE_TYPE.NOTE,
      favorite: false,
      pin: false,
      is_archived: false,
    });
    // status is optional (derived by the service from context); no default on the schema
    expect(result.status).toBeUndefined();
  });

  it("accepts all valid fields", () => {
    const result = createNoteSchema.parse({
      name: "Research note",
      content: '{"type":"doc","content":[]}',
      type: NOTE_TYPE.RESEARCH,
      status: NOTE_STATUS.ACTIVE,
      notebooks: ["Ideas"],
      area_id: "11111111-1111-4111-8111-111111111111",
      project_id: "22222222-2222-4222-8222-222222222222",
      favorite: true,
      pin: true,
      is_archived: false,
    });

    expect(result.name).toBe("Research note");
    expect(result.type).toBe(NOTE_TYPE.RESEARCH);
    expect(result.status).toBe(NOTE_STATUS.ACTIVE);
    expect(result.notebooks).toEqual(["Ideas"]);
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

  it("accepts custom type text", () => {
    const result = createNoteSchema.parse({
      name: "Custom type note",
      type: "My Custom Type",
    });

    expect(result.type).toBe("My Custom Type");
  });

  it("accepts area_ids array for multi-area linkage", () => {
    const result = createNoteSchema.parse({
      name: "Multi-area note",
      area_ids: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });

    expect(result.area_ids).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("accepts goal_ids array for multi-goal linkage", () => {
    const result = createNoteSchema.parse({
      name: "Multi-goal note",
      goal_ids: [
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ],
    });

    expect(result.goal_ids).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ]);
  });

  it("accepts task_ids array for multi-task linkage", () => {
    const result = createNoteSchema.parse({
      name: "Multi-task note",
      task_ids: [
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
      ],
    });

    expect(result.task_ids).toEqual([
      "55555555-5555-4555-8555-555555555555",
      "66666666-6666-4666-8666-666666666666",
    ]);
  });

  it("defaults notebooks to [] and normalizes empty content to null", () => {
    const result = createNoteSchema.parse({
      name: "Note",
      content: "",
    });

    expect(result.notebooks).toEqual([]);
    expect(result.content).toBeNull();
  });

  it("rejects invalid UUID in area_ids", () => {
    expect(() =>
      createNoteSchema.parse({
        name: "Note",
        area_ids: ["11111111-1111-4111-8111-111111111111", "not-a-uuid"],
      }),
    ).toThrow();
  });

  it("rejects invalid UUID in goal_ids", () => {
    expect(() =>
      createNoteSchema.parse({
        name: "Note",
        goal_ids: ["not-a-uuid"],
      }),
    ).toThrow();
  });

  it("rejects invalid UUID in task_ids", () => {
    expect(() =>
      createNoteSchema.parse({
        name: "Note",
        task_ids: ["not-a-uuid"],
      }),
    ).toThrow();
  });

  it("accepts project_ids array for multi-project linkage", () => {
    const result = createNoteSchema.parse({
      name: "Multi-project note",
      project_ids: [
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
      ],
    });

    expect(result.project_ids).toEqual([
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
    ]);
  });

  it("rejects invalid UUID in project_ids", () => {
    expect(() =>
      createNoteSchema.parse({
        name: "Note",
        project_ids: ["not-a-uuid"],
      }),
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

  it("accepts notebooks update", () => {
    const result = updateNoteSchema.parse({ notebooks: ["Work"] });
    expect(result.notebooks).toEqual(["Work"]);
  });

  it("normalizes empty content to null", () => {
    const result = updateNoteSchema.parse({
      content: "",
    });

    expect(result.content).toBeNull();
  });

  it("accepts custom type text", () => {
    const result = updateNoteSchema.parse({ type: "Meeting Notes" });
    expect(result.type).toBe("Meeting Notes");
  });

  it("accepts area_ids array for multi-area linkage", () => {
    const result = updateNoteSchema.parse({
      area_ids: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });

    expect(result.area_ids).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("accepts goal_ids array for multi-goal linkage", () => {
    const result = updateNoteSchema.parse({
      goal_ids: [
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ],
    });

    expect(result.goal_ids).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ]);
  });

  it("accepts task_ids array for multi-task linkage", () => {
    const result = updateNoteSchema.parse({
      task_ids: [
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
      ],
    });

    expect(result.task_ids).toEqual([
      "55555555-5555-4555-8555-555555555555",
      "66666666-6666-4666-8666-666666666666",
    ]);
  });

  it("rejects invalid UUID in area_ids", () => {
    expect(() =>
      updateNoteSchema.parse({
        area_ids: ["11111111-1111-4111-8111-111111111111", "not-a-uuid"],
      }),
    ).toThrow();
  });

  it("rejects invalid UUID in goal_ids", () => {
    expect(() =>
      updateNoteSchema.parse({ goal_ids: ["not-a-uuid"] }),
    ).toThrow();
  });

  it("rejects invalid UUID in task_ids", () => {
    expect(() =>
      updateNoteSchema.parse({ task_ids: ["not-a-uuid"] }),
    ).toThrow();
  });

  it("accepts project_ids array for multi-project linkage", () => {
    const result = updateNoteSchema.parse({
      project_ids: [
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
      ],
    });

    expect(result.project_ids).toEqual([
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
    ]);
  });

  it("rejects invalid UUID in project_ids", () => {
    expect(() =>
      updateNoteSchema.parse({ project_ids: ["not-a-uuid"] }),
    ).toThrow();
  });

  it("rejects unknown fields", () => {
    expect(() =>
      updateNoteSchema.parse({ status: NOTE_STATUS.ACTIVE, unknownKey: "x" }),
    ).toThrow();
  });
});
