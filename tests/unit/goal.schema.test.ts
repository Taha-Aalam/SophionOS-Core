import { describe, expect, it } from "vitest";

import { createGoalSchema, updateGoalSchema } from "../../src/lib/validators/goal.schema";
import { GOAL_TERM, PRIORITY } from "../../src/lib/utils/constants";

describe("goal schemas", () => {
  it("accepts a valid goal payload with optional nullable fields", () => {
    const result = createGoalSchema.parse({
      area_id: null,
      name: "Ship Phase 2",
      description: "Restore the Goals module",
      term: GOAL_TERM.MID,
      priority: PRIORITY.HIGH,
      target_date: "2026-06-30",
      progress: 35,
    });

    expect(result).toMatchObject({
      area_id: null,
      name: "Ship Phase 2",
      term: GOAL_TERM.MID,
      priority: PRIORITY.HIGH,
      target_date: "2026-06-30",
      progress: 35,
      is_completed: false,
      is_archived: false,
    });
  });

  it("rejects invalid progress values", () => {
    expect(() =>
      createGoalSchema.parse({
        name: "Impossible progress",
        term: GOAL_TERM.SHORT,
        progress: 101,
      }),
    ).toThrow();
  });

  it("rejects invalid date formats", () => {
    expect(() =>
      createGoalSchema.parse({
        name: "Invalid date goal",
        term: GOAL_TERM.LONG,
        target_date: "06/30/2026",
      }),
    ).toThrow();
  });

  it("keeps update schema strict", () => {
    expect(() =>
      updateGoalSchema.parse({
        is_completed: true,
        unexpected: true,
      }),
    ).toThrow();
  });
});
