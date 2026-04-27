import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockGetByIdentifier = vi.fn();
const mockProjectListByGoal = vi.fn();
const mockTaskListByGoal = vi.fn();
const mockNoteListByGoal = vi.fn();
const mockResourceListByGoal = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
  }),
}));

vi.mock("@/lib/services/goal.service", () => ({
  goalService: {
    getByIdentifier: (...args: unknown[]) => mockGetByIdentifier(...args),
  },
}));

vi.mock("@/lib/services/project.service", () => ({
  projectService: {
    listByGoal: (...args: unknown[]) => mockProjectListByGoal(...args),
  },
}));

vi.mock("@/lib/services/task.service", () => ({
  taskService: {
    listByGoal: (...args: unknown[]) => mockTaskListByGoal(...args),
  },
}));

vi.mock("@/lib/services/note.service", () => ({
  noteService: {
    listByGoal: (...args: unknown[]) => mockNoteListByGoal(...args),
  },
}));

vi.mock("@/lib/services/resource.service", () => ({
  resourceService: {
    listByGoal: (...args: unknown[]) => mockResourceListByGoal(...args),
  },
}));

import { useGoalDetail } from "../../src/lib/hooks/use-goal-detail";

describe("useGoalDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockImplementation((options) => options);
    mockGetByIdentifier.mockResolvedValue({
      id: "goal-uuid-1",
      name: "Test Goal Name",
    });
    mockProjectListByGoal.mockResolvedValue([]);
    mockTaskListByGoal.mockResolvedValue([]);
    mockNoteListByGoal.mockResolvedValue([]);
    mockResourceListByGoal.mockResolvedValue([]);
  });

  it("resolves the goal by slug, then uses the resolved goal id for related entity queries", async () => {
    const query = useGoalDetail("test-goal-name-1");
    const data = await query.queryFn();

    expect(mockGetByIdentifier).toHaveBeenCalledWith("user-123", "test-goal-name-1");
    expect(mockProjectListByGoal).toHaveBeenCalledWith("user-123", "goal-uuid-1");
    expect(mockTaskListByGoal).toHaveBeenCalledWith("user-123", "goal-uuid-1");
    expect(mockNoteListByGoal).toHaveBeenCalledWith("user-123", "goal-uuid-1");
    expect(mockResourceListByGoal).toHaveBeenCalledWith("user-123", "goal-uuid-1");
    expect(data.goal.id).toBe("goal-uuid-1");
  });
});
