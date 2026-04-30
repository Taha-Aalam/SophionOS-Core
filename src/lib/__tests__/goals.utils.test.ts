import { describe, expect, it } from "vitest";

import type { Goal } from "@/lib/types/domain.types";
import { getAreaRollups } from "@/lib/utils/areas";
import { goalMatchesFilters } from "@/lib/utils/goals";

function buildGoal(overrides: Partial<Goal> & { linkedAreaIds?: string[] } = {}): Goal {
  return {
    area_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    description: null,
    id: "goal-id",
    is_archived: false,
    is_completed: false,
    linkedAreaIds: [],
    name: "Goal",
    priority: "medium",
    progress: 0,
    slug: "goal",
    target_date: null,
    term: "mid",
    updated_at: "2026-01-01T00:00:00.000Z",
    user_id: "user-id",
    ...overrides,
  };
}

describe("goalMatchesFilters", () => {
  it("matches the area filter when the area is linked through linkedAreaIds", () => {
    const goal = buildGoal({
      area_id: "123e4567-e89b-42d3-a456-426614174000",
      linkedAreaIds: [
        "123e4567-e89b-42d3-a456-426614174000",
        "123e4567-e89b-42d3-a456-426614174001",
      ],
    });

    expect(goalMatchesFilters(goal, { areaId: "123e4567-e89b-42d3-a456-426614174001" })).toBe(
      true,
    );
  });
});

describe("getAreaRollups", () => {
  it("counts goals linked through linkedAreaIds even when their primary area differs", () => {
    const rollups = getAreaRollups({
      areaId: "123e4567-e89b-42d3-a456-426614174001",
      goals: [
        buildGoal({
          area_id: "123e4567-e89b-42d3-a456-426614174000",
          linkedAreaIds: [
            "123e4567-e89b-42d3-a456-426614174000",
            "123e4567-e89b-42d3-a456-426614174001",
          ],
        }),
      ],
      notes: [],
      projects: [],
      tasks: [],
    });

    expect(rollups.goalsCount).toBe(1);
  });
});
