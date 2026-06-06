import { describe, expect, it } from "vitest";

import {
  TASK_REPEAT_CYCLE,
  computeNextTaskDueDate,
} from "@/lib/utils/task-recurrence";

describe("computeNextTaskDueDate", () => {
  it("adds day intervals", () => {
    expect(
      computeNextTaskDueDate("2026-06-05", 2, TASK_REPEAT_CYCLE.DAYS),
    ).toBe("2026-06-07");
  });

  it("adds week intervals", () => {
    expect(
      computeNextTaskDueDate("2026-06-05", 2, TASK_REPEAT_CYCLE.WEEKS),
    ).toBe("2026-06-19");
  });

  it("adds month intervals", () => {
    expect(
      computeNextTaskDueDate("2026-01-31", 1, TASK_REPEAT_CYCLE.MONTHS),
    ).toBe("2026-02-28");
  });

  it("adds year intervals", () => {
    expect(
      computeNextTaskDueDate("2024-02-29", 1, TASK_REPEAT_CYCLE.YEARS),
    ).toBe("2025-02-28");
  });

  it("finds first weekday of the target month", () => {
    expect(
      computeNextTaskDueDate("2026-06-05", 1, TASK_REPEAT_CYCLE.MONTHS_FIRST_WEEKDAY),
    ).toBe("2026-07-01");
  });

  it("finds last weekday of the target month", () => {
    expect(
      computeNextTaskDueDate("2026-06-05", 1, TASK_REPEAT_CYCLE.MONTHS_LAST_WEEKDAY),
    ).toBe("2026-07-31");
  });

  it("finds second saturday of the target month", () => {
    expect(
      computeNextTaskDueDate("2026-06-05", 1, TASK_REPEAT_CYCLE.MONTHS_SECOND_SATURDAY),
    ).toBe("2026-07-11");
  });

  it("finds last day of the target month", () => {
    expect(
      computeNextTaskDueDate("2026-06-05", 1, TASK_REPEAT_CYCLE.MONTHS_LAST_DAY),
    ).toBe("2026-07-31");
  });
});
