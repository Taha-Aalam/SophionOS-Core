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
      id: "goal-1",
      is_archived: false,
    };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockGoal, error: null }),
    };

    vi.mocked(createClient).mockImplementation(() => mockClient as never);

    const result = await goalService.restore(userId, "goal-1");

    expect(result).toEqual(mockGoal);
    expect(mockClient.update).toHaveBeenCalledWith({ is_archived: false });
  });
});
