import { describe, expect, it } from "vitest";

import { createProjectSchema, updateProjectSchema } from "@/lib/validators/project.schema";

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getRelativeDate(daysFromToday: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);

  return formatDateInput(date);
}

function buildValidProjectInput(overrides?: Partial<Record<string, unknown>>) {
  return {
    area_id: "123e4567-e89b-42d3-a456-426614174000",
    description: "Test project",
    due_date: getRelativeDate(7),
    goal_ids: [],
    is_archived: false,
    name: "Test project",
    priority: "medium",
    progress: 0,
    start_date: getRelativeDate(1),
    status: "planning",
    ...overrides,
  };
}

describe("createProjectSchema", () => {
  it("rejects a due date that comes before the start date", () => {
    const result = createProjectSchema.safeParse(
      buildValidProjectInput({
        due_date: getRelativeDate(1),
        start_date: getRelativeDate(7),
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Due date cannot be before the start date",
          path: ["due_date"],
        }),
      ]),
    );
  });

  it("rejects a start date in the past", () => {
    const result = createProjectSchema.safeParse(
      buildValidProjectInput({
        start_date: getRelativeDate(-1),
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Start date cannot be in the past",
          path: ["start_date"],
        }),
      ]),
    );
  });

  it("rejects a due date in the past", () => {
    const result = createProjectSchema.safeParse(
      buildValidProjectInput({
        due_date: getRelativeDate(-1),
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Due date cannot be in the past",
          path: ["due_date"],
        }),
      ]),
    );
  });
});

describe("updateProjectSchema", () => {
  it("rejects a due date that comes before the start date", () => {
    const result = updateProjectSchema.safeParse({
      due_date: getRelativeDate(1),
      start_date: getRelativeDate(7),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Due date cannot be before the start date",
          path: ["due_date"],
        }),
      ]),
    );
  });

  it("allows updating an older project without forcing past dates into the future", () => {
    const result = updateProjectSchema.safeParse({
      due_date: getRelativeDate(-1),
      start_date: getRelativeDate(-7),
    });

    expect(result.success).toBe(true);
  });
});
