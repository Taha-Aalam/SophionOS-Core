import { beforeEach, describe, expect, it, vi } from "vitest";

const cancelQueries = vi.fn();
const getQueriesData = vi.fn();
const invalidateQueries = vi.fn();
const setQueriesData = vi.fn();
const setQueryData = vi.fn();
const mockQueryClient = {
  cancelQueries,
  getQueriesData,
  invalidateQueries,
  setQueriesData,
  setQueryData,
};

const mockUseMutation = vi.fn();
const mockUseQuery = vi.fn();
const mockUseQueryClient = vi.fn(() => mockQueryClient);

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: unknown) => mockUseMutation(options),
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../src/lib/services/goal.service", () => ({
  goalService: {
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
  },
}));

import {
  useArchiveGoal,
  useCompleteGoal,
  useRestoreGoal,
  useUpdateGoal,
} from "../../src/lib/hooks/use-goals";

interface CapturedMutation {
  onMutate?: (variables: unknown) => Promise<unknown>;
  onError?: (error: Error, variables: unknown, context: unknown) => void;
  onSuccess?: () => void;
  onSettled?: () => Promise<void>;
}

function captureOptions(): CapturedMutation {
  return mockUseMutation.mock.calls[mockUseMutation.mock.calls.length - 1][0];
}

describe("goal mutation cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockImplementation((options) => options);
    getQueriesData.mockReturnValue([]);
  });

  it("useUpdateGoal invalidates goals and goal-detail (not areas — update doesn't change area counts)", async () => {
    useUpdateGoal();
    const opts = captureOptions();
    await opts.onSettled?.();

    const calls = invalidateQueries.mock.calls.map((call) => call[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        { queryKey: ["goals"] },
        { queryKey: ["goal-detail"] },
      ]),
    );
    expect(calls).not.toEqual(
      expect.arrayContaining([{ queryKey: ["areas"] }]),
    );
  });

  it("useArchiveGoal invalidates the goal-detail query so the page stays in sync", async () => {
    useArchiveGoal();
    await captureOptions().onSettled?.();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["goal-detail"] });
  });

  it("useCompleteGoal invalidates the goal-detail query so the completion checkbox state refreshes", async () => {
    useCompleteGoal();
    await captureOptions().onSettled?.();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["goal-detail"] });
  });

  it("useRestoreGoal invalidates the goal-detail query", async () => {
    useRestoreGoal();
    await captureOptions().onSettled?.();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["goal-detail"] });
  });

  it("useUpdateGoal moves a goal between filtered goal-list caches optimistically", async () => {
    useUpdateGoal();
    const options = captureOptions();
    const currentGoal = {
      id: "goal-1",
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      is_archived: false,
      is_completed: false,
      name: "Goal 1",
      priority: "medium",
      progress: 0,
      slug: "goal-1",
      target_date: null,
      term: "short",
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: "user-1",
    };

    getQueriesData
      .mockReturnValueOnce([
        [["goals", { status: "active", term: "all" }], [currentGoal]],
        [["goals", { status: "completed", term: "all" }], []],
      ])
      .mockReturnValueOnce([
        [
          ["goal-detail", "goal-1", undefined],
          {
            goal: currentGoal,
            projects: [],
            tasks: [],
            notes: [],
            resources: [],
            rollups: {
              completedTaskCount: 0,
              noteCount: 0,
              projectCount: 0,
              resourceCount: 0,
              taskCount: 0,
            },
          },
        ],
      ]);

    await options.onMutate?.({
      id: "goal-1",
      input: { is_completed: true, progress: 100 },
    });

    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ["goals"] });
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ["goal-detail"] });
    expect(setQueryData).toHaveBeenCalledWith(
      ["goals", { status: "active", term: "all" }],
      [],
    );
    expect(setQueryData).toHaveBeenCalledWith(
      ["goals", { status: "completed", term: "all" }],
      [{ ...currentGoal, is_completed: true, progress: 100 }],
    );

    const goalDetailUpdater = setQueriesData.mock.calls[0][1] as (current: {
      goal: typeof currentGoal;
      projects: [];
      tasks: [];
      notes: [];
      resources: [];
      rollups: {
        completedTaskCount: number;
        noteCount: number;
        projectCount: number;
        resourceCount: number;
        taskCount: number;
      };
    }) => unknown;
    expect(
      goalDetailUpdater({
        goal: currentGoal,
        projects: [],
        tasks: [],
        notes: [],
        resources: [],
        rollups: {
          completedTaskCount: 0,
          noteCount: 0,
          projectCount: 0,
          resourceCount: 0,
          taskCount: 0,
        },
      }),
    ).toMatchObject({
      goal: { id: "goal-1", is_completed: true, progress: 100 },
    });
  });

  it("useUpdateGoal removes an archived goal from the active list immediately", async () => {
    useUpdateGoal();
    const options = captureOptions();
    const currentGoal = {
      id: "goal-2",
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      is_archived: false,
      is_completed: false,
      name: "Goal 2",
      priority: "medium",
      progress: 0,
      slug: "goal-2",
      target_date: null,
      term: "short",
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: "user-1",
    };

    getQueriesData
      .mockReturnValueOnce([
        [["goals", { status: "active", term: "all" }], [currentGoal]],
      ])
      .mockReturnValueOnce([
        [
          ["goal-detail", "goal-2", undefined],
          {
            goal: currentGoal,
            projects: [],
            tasks: [],
            notes: [],
            resources: [],
            rollups: {
              completedTaskCount: 0,
              noteCount: 0,
              projectCount: 0,
              resourceCount: 0,
              taskCount: 0,
            },
          },
        ],
      ]);

    await options.onMutate?.({
      id: "goal-2",
      input: { is_archived: true },
    });

    expect(setQueryData).toHaveBeenCalledWith(
      ["goals", { status: "active", term: "all" }],
      [],
    );
  });

  it("useUpdateGoal derives reopened progress from cached goal detail when progress is omitted", async () => {
    useUpdateGoal();
    const options = captureOptions();
    const currentGoal = {
      id: "goal-3",
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      is_archived: false,
      is_completed: true,
      name: "Goal 3",
      priority: "medium",
      progress: 100,
      slug: "goal-3",
      target_date: null,
      term: "short",
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: "user-1",
    };

    getQueriesData
      .mockReturnValueOnce([
        [["goals", { status: "active", term: "all" }], []],
      ])
      .mockReturnValueOnce([
        [
          ["goal-detail", "goal-3", undefined],
          {
            goal: currentGoal,
            projects: [
              { is_archived: false, status: "active" },
              { is_archived: false, status: "completed" },
            ],
            tasks: [],
            notes: [],
            resources: [],
            rollups: {
              completedTaskCount: 0,
              noteCount: 0,
              projectCount: 2,
              resourceCount: 0,
              taskCount: 0,
            },
          },
        ],
      ]);

    await options.onMutate?.({
      id: "goal-3",
      input: { is_completed: false },
    });

    expect(setQueryData).toHaveBeenCalledWith(
      ["goals", { status: "active", term: "all" }],
      [{ ...currentGoal, is_completed: false, progress: 50 }],
    );
  });

  it("useUpdateGoal falls back to 0 optimistic progress when reopening without goal detail context", async () => {
    useUpdateGoal();
    const options = captureOptions();
    const currentGoal = {
      id: "goal-4",
      area_id: null,
      created_at: "2026-04-28T10:00:00.000Z",
      description: null,
      is_archived: false,
      is_completed: true,
      name: "Goal 4",
      priority: "medium",
      progress: 100,
      slug: "goal-4",
      target_date: null,
      term: "short",
      updated_at: "2026-04-28T10:00:00.000Z",
      user_id: "user-1",
    };

    getQueriesData
      .mockReturnValueOnce([
        [["goals", { status: "active", term: "all" }], []],
        [["goals", { status: "completed", term: "all" }], [currentGoal]],
      ])
      .mockReturnValueOnce([]);

    await options.onMutate?.({
      id: "goal-4",
      input: { is_completed: false },
    });

    expect(setQueryData).toHaveBeenCalledWith(
      ["goals", { status: "active", term: "all" }],
      [{ ...currentGoal, is_completed: false, progress: 0 }],
    );
  });
});
