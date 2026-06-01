import { describe, expect, it } from "vitest";

import { createNoteSchema } from "@/lib/validators/note.schema";
import { createResourceSchema } from "@/lib/validators/resource.schema";
import { createTaskSchema } from "@/lib/validators/task.schema";

describe("create schemas leave status undefined when omitted", () => {
  it("task", () => {
    const parsed = createTaskSchema.parse({ name: "T" });
    expect(parsed.status).toBeUndefined();
  });
  it("note", () => {
    const parsed = createNoteSchema.parse({ name: "N" });
    expect(parsed.status).toBeUndefined();
  });
  it("resource", () => {
    const parsed = createResourceSchema.parse({ name: "R" });
    expect(parsed.status).toBeUndefined();
  });
  it("still accepts an explicit status", () => {
    expect(createTaskSchema.parse({ name: "T", status: "todo" }).status).toBe("todo");
  });
});
