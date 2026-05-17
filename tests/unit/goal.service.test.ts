import { beforeEach, describe, expect, it, vi } from "vitest";

import { goalService } from "../../src/lib/services/goal.service";
import { createClient } from "../../src/lib/supabase/client";
import { GOAL_TERM } from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => {
  return {
    createClient: vi.fn(),
  };
});

describe("goalService", () => {
  const userId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters active goals by incomplete and unarchived status", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    await goalService.list(userId, {
      status: "active",
      term: GOAL_TERM.SHORT,
    });

    expect(mockClient.eq).toHaveBeenCalledWith("user_id", userId);
    expect(mockClient.eq).toHaveBeenCalledWith("term", GOAL_TERM.SHORT);
    expect(mockClient.eq).toHaveBeenCalledWith("is_completed", false);
    expect(mockClient.eq).toHaveBeenCalledWith("is_archived", false);
  });

  it("filters completed goals without including archived goals", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    await goalService.list(userId, { status: "completed" });

    expect(mockClient.eq).toHaveBeenCalledWith("is_completed", true);
    expect(mockClient.eq).toHaveBeenCalledWith("is_archived", false);
  });

  it("treats inactive goals as archived goals because archive is the persisted model state", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    await goalService.list(userId, { status: "inactive" });

    expect(mockClient.eq).toHaveBeenCalledWith("is_archived", true);
    expect(mockClient.eq).not.toHaveBeenCalledWith("is_completed", true);
  });

  it("restores archived goals by clearing is_archived", async () => {
    const mockGoal = {
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      id: "goal-1",
      is_archived: false,
      is_completed: false,
      name: "Goal 1",
      priority: "medium",
      progress: 0,
      slug: "goal-1",
      target_date: null,
      term: GOAL_TERM.SHORT,
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: userId,
    };
    const goalsTable = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockGoal, error: null }),
    };
    const goalProjectsTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const goalTasksTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "goals") return goalsTable;
        if (table === "goal_projects") return goalProjectsTable;
        if (table === "goal_tasks") return goalTasksTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    const result = await goalService.restore(userId, "goal-1");

    expect(result).toMatchObject({
      ...mockGoal,
      linkedAreaIds: [],
    });
    expect(goalsTable.update).toHaveBeenCalledWith({ is_archived: false });
  });

  it("recomputes progress when a completed goal is reopened without an explicit progress value", async () => {
    let updatedPayload: Record<string, unknown> | undefined;
    let goalSingleCount = 0;
    const currentGoal = {
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      id: "goal-1",
      is_archived: false,
      is_completed: true,
      name: "Goal 1",
      priority: "medium",
      progress: 100,
      slug: "goal-1",
      target_date: null,
      term: GOAL_TERM.SHORT,
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: userId,
    };
    const updatedGoal = {
      ...currentGoal,
      is_completed: false,
      progress: 50,
    };
    const goalsTable = {
      from: vi.fn(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockImplementation((payload) => {
        updatedPayload = payload;
        return goalsTable;
      }),
      single: vi.fn().mockImplementation(async () => {
        goalSingleCount += 1;
        return {
          data: goalSingleCount === 1 ? currentGoal : updatedGoal,
          error: null,
        };
      }),
    };
    const goalProjectsTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { goal_id: "goal-1", project: { is_archived: false, status: "active" } },
          { goal_id: "goal-1", project: { is_archived: false, status: "completed" } },
        ],
        error: null,
      }),
    };
    const goalTasksTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "goals") return goalsTable;
        if (table === "goal_projects") return goalProjectsTable;
        if (table === "goal_tasks") return goalTasksTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    const result = await goalService.update(userId, "goal-1", { is_completed: false });

    expect(updatedPayload).toEqual({ is_completed: false, progress: 50 });
    expect(result.progress).toBe(50);
    expect(result.is_completed).toBe(false);
  });

  it("handles relation payloads when Supabase returns nested project and task rows as arrays", async () => {
    const goal = {
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      id: "goal-array-shape",
      is_archived: false,
      is_completed: false,
      name: "Goal Array Shape",
      priority: "medium",
      progress: 0,
      slug: "goal-array-shape",
      target_date: null,
      term: GOAL_TERM.SHORT,
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: userId,
    };
    const goalsTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [goal], error: null }),
    };
    const goalProjectsTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            goal_id: goal.id,
            project: [{ is_archived: false, status: "completed" }],
          },
        ],
        error: null,
      }),
    };
    const goalTasksTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            goal_id: goal.id,
            task: [{ is_archived: false, is_completed: true }],
          },
        ],
        error: null,
      }),
    };
    const emptyTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "goals") return goalsTable;
        if (table === "goal_projects") return goalProjectsTable;
        if (table === "goal_tasks") return goalTasksTable;
        if (table === "goal_areas") return emptyTable;
        if (table === "goal_notes") return emptyTable;
        if (table === "goal_resources") return emptyTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    const result = await goalService.list(userId, { status: "active" });

    expect(result).toHaveLength(1);
    expect(result[0]?.progress).toBe(100);
  });

  it("falls back to the legacy single-area model when goal_areas is unavailable", async () => {
    const goal = {
      area_id: "123e4567-e89b-42d3-a456-426614174000",
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      id: "goal-legacy-area",
      is_archived: false,
      is_completed: false,
      name: "Legacy Goal",
      priority: "medium",
      progress: 0,
      slug: "legacy-goal",
      target_date: null,
      term: GOAL_TERM.SHORT,
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: userId,
    };
    const goalsTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [goal], error: null }),
    };
    const goalAreasTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "42P01",
          message: 'relation "goal_areas" does not exist',
        },
      }),
    };
    const goalProjectsTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const goalTasksTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const emptyTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "goals") return goalsTable;
        if (table === "goal_areas") return goalAreasTable;
        if (table === "goal_projects") return goalProjectsTable;
        if (table === "goal_tasks") return goalTasksTable;
        if (table === "goal_notes") return emptyTable;
        if (table === "goal_resources") return emptyTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    const result = await goalService.list(userId, { status: "active" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      area_id: goal.area_id,
      id: goal.id,
      linkedAreaIds: [goal.area_id],
      name: goal.name,
    });
  });

  it("resets reopened goals to 0 progress when no linked projects or tasks exist", async () => {
    let updatedPayload: Record<string, unknown> | undefined;
    let goalSingleCount = 0;
    const currentGoal = {
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      id: "goal-2",
      is_archived: false,
      is_completed: true,
      name: "Goal 2",
      priority: "medium",
      progress: 100,
      slug: "goal-2",
      target_date: null,
      term: GOAL_TERM.SHORT,
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: userId,
    };
    const updatedGoal = {
      ...currentGoal,
      is_completed: false,
      progress: 0,
    };
    const goalsTable = {
      from: vi.fn(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockImplementation((payload) => {
        updatedPayload = payload;
        return goalsTable;
      }),
      single: vi.fn().mockImplementation(async () => {
        goalSingleCount += 1;
        return {
          data: goalSingleCount === 1 ? currentGoal : updatedGoal,
          error: null,
        };
      }),
    };
    const goalProjectsTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const goalTasksTable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "goals") return goalsTable;
        if (table === "goal_projects") return goalProjectsTable;
        if (table === "goal_tasks") return goalTasksTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    const result = await goalService.update(userId, "goal-2", { is_completed: false });

    expect(updatedPayload).toEqual({ is_completed: false, progress: 0 });
    expect(result.progress).toBe(0);
    expect(result.is_completed).toBe(false);
  });
});
