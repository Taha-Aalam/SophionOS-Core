import { describe, expect, it } from "vitest";

import {
  createGoalFormSchema,
  createGoalSchema,
  updateGoalFormSchema,
  updateGoalSchema,
} from "@/lib/validators/goal.schema";

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

describe("createGoalSchema", () => {
  it("accepts multiple linked areas for a goal", () => {
    const result = createGoalSchema.safeParse({
      area_ids: [
        "123e4567-e89b-42d3-a456-426614174000",
        "123e4567-e89b-42d3-a456-426614174001",
      ],
      description: "Ship the next release",
      is_archived: false,
      is_completed: false,
      name: "Launch v2",
      priority: "high",
      progress: 0,
      target_date: getRelativeDate(14),
      term: "mid",
    });

    expect(result.success).toBe(true);
    expect(result.data?.area_ids).toEqual([
      "123e4567-e89b-42d3-a456-426614174000",
      "123e4567-e89b-42d3-a456-426614174001",
    ]);
  });

  it("provides a dialog-safe form schema without requiring archive fields", () => {
    const result = createGoalFormSchema.safeParse({
      area_ids: [
        "123e4567-e89b-42d3-a456-426614174000",
        "123e4567-e89b-42d3-a456-426614174001",
      ],
      description: "Ship the next release",
      name: "Launch v2",
      priority: "high",
      progress: 0,
      target_date: getRelativeDate(14),
      term: "mid",
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("is_archived");
    expect(result.data).not.toHaveProperty("is_completed");
    expect(result.data).not.toHaveProperty("slug");
  });
});

describe("updateGoalSchema", () => {
  it("accepts updating a goal with multiple areas", () => {
    const result = updateGoalSchema.safeParse({
      area_ids: [
        "123e4567-e89b-42d3-a456-426614174000",
        "123e4567-e89b-42d3-a456-426614174001",
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.area_ids).toEqual([
      "123e4567-e89b-42d3-a456-426614174000",
      "123e4567-e89b-42d3-a456-426614174001",
    ]);
  });

  it("provides a dialog-safe update schema without archive toggles", () => {
    const result = updateGoalFormSchema.safeParse({
      area_ids: ["123e4567-e89b-42d3-a456-426614174000"],
      name: "Refine launch plan",
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("is_archived");
    expect(result.data).not.toHaveProperty("is_completed");
  });
});
