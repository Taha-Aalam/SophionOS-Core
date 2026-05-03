import { describe, expect, it } from "vitest";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/task.schema";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

describe("createTaskSchema – due_date past-date guard", () => {
  it("accepts a future due_date", () => {
    const result = createTaskSchema.safeParse({ name: "Task", due_date: tomorrow() });
    expect(result.success).toBe(true);
  });

  it("accepts today as due_date", () => {
    const result = createTaskSchema.safeParse({ name: "Task", due_date: today() });
    expect(result.success).toBe(true);
  });

  it("rejects a past due_date", () => {
    const result = createTaskSchema.safeParse({ name: "Task", due_date: yesterday() });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes("past"))).toBe(true);
    }
  });

  it("accepts null due_date", () => {
    const result = createTaskSchema.safeParse({ name: "Task", due_date: null });
    expect(result.success).toBe(true);
  });

  it("accepts empty string due_date (coerces to null)", () => {
    const result = createTaskSchema.safeParse({ name: "Task", due_date: "" });
    expect(result.success).toBe(true);
  });
});

describe("updateTaskSchema – past due_date is allowed on update", () => {
  it("allows a past due_date on update", () => {
    const result = updateTaskSchema.safeParse({ due_date: yesterday() });
    expect(result.success).toBe(true);
  });
});
