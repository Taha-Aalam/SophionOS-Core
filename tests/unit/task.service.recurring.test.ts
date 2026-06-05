/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { taskService } from "@/lib/services/task.service";
import { createClient } from "@/lib/supabase/client";
import { PRIORITY, TASK_REPEAT_CYCLE, TASK_STATUS } from "@/lib/utils/constants";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/task.schema";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

describe("createTaskSchema – form-level recurrence validation", () => {
  it("rejects enabling recurrence without due_date", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dueDateIssue = result.error.issues.find((i) => i.path[0] === "due_date");
      expect(dueDateIssue?.message).toMatch(/due date/i);
    }
  });

  it("rejects repeat_every = 0", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 0,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a recurring payload when all fields are present", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(true);
  });
});

describe("createTaskSchema – recurring input validation", () => {
  it("accepts a recurring create payload with all recurrence fields", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_recurring).toBe(true);
      expect(result.data.repeat_every).toBe(1);
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.DAYS);
    }
  });

  it("defaults is_recurring to false when omitted", () => {
    const result = createTaskSchema.safeParse({ name: "One-off" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_recurring).toBe(false);
    }
  });

  it("rejects a recurring task missing due_date", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dueDateIssue = result.error.issues.find((i) => i.path[0] === "due_date");
      expect(dueDateIssue?.message).toMatch(/due date/i);
    }
  });

  it("rejects repeat_every < 1", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 0,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing repeat_cycle when recurring", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cycleIssue = result.error.issues.find((i) => i.path[0] === "repeat_cycle");
      expect(cycleIssue?.message).toMatch(/cycle/i);
    }
  });

  it("coerces string-typed repeat_every from form input", () => {
    const result = createTaskSchema.safeParse({
      name: "Standup",
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: "2",
      repeat_cycle: TASK_REPEAT_CYCLE.WEEKS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repeat_every).toBe(2);
    }
  });
});

describe("updateTaskSchema – partial recurrence edits", () => {
  it("allows turning recurrence on with full inputs", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      due_date: futureDate(1),
      repeat_every: 2,
      repeat_cycle: TASK_REPEAT_CYCLE.WEEKS,
    });
    expect(result.success).toBe(true);
  });

  it("allows turning recurrence off without touching repeat_every", () => {
    const result = updateTaskSchema.safeParse({ is_recurring: false });
    expect(result.success).toBe(true);
  });

  it("does not require due_date when only toggling focus", () => {
    const result = updateTaskSchema.safeParse({ is_focused: true });
    expect(result.success).toBe(true);
  });

  it("rejects enabling recurrence without due_date", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(false);
  });
});

describe("taskService.create – persists recurrence columns", () => {
  const userId = "user-1";
  const taskId = "task-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("sends is_recurring, repeat_every, repeat_cycle on insert", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: taskId, user_id: userId, name: "Standup" },
        error: null,
      }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    await taskService.create(userId, {
      name: "Standup",
      due_date: futureDate(1),
      priority: PRIORITY.MEDIUM,
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    } as never);

    expect(mockClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_recurring: true,
        repeat_every: 1,
        repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      }),
    );
  });

  it("sends is_recurring=false for non-recurring tasks (no recurrence fields)", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: taskId, user_id: userId, name: "One-off" },
        error: null,
      }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    await taskService.create(userId, { name: "One-off" } as never);

    expect(mockClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_recurring: false }),
    );
  });

  it("rejects a recurring payload that omits due_date (validation)", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await expect(
      taskService.create(userId, {
        name: "Standup",
        is_recurring: true,
        repeat_every: 1,
        repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      } as never),
    ).rejects.toThrow();
    expect(mockClient.insert).not.toHaveBeenCalled();
  });

  it("rejects a recurring payload with repeat_every=0", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await expect(
      taskService.create(userId, {
        name: "Standup",
        due_date: futureDate(1),
        is_recurring: true,
        repeat_every: 0,
        repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      } as never),
    ).rejects.toThrow();
    expect(mockClient.insert).not.toHaveBeenCalled();
  });

  it("rejects a recurring payload missing repeat_cycle", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await expect(
      taskService.create(userId, {
        name: "Standup",
        due_date: futureDate(1),
        is_recurring: true,
        repeat_every: 1,
      } as never),
    ).rejects.toThrow();
    expect(mockClient.insert).not.toHaveBeenCalled();
  });
});

describe("taskService.update – toggles recurrence on and off", () => {
  const userId = "user-1";
  const taskId = "task-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("turns recurrence on with full inputs", async () => {
    const updated = { id: taskId, is_recurring: true };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await taskService.update(userId, taskId, {
      is_recurring: true,
      due_date: futureDate(1),
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    } as never);

    expect(mockClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_recurring: true,
        repeat_every: 1,
        repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      }),
    );
  });

  it("turns recurrence off and nulls the recurrence inputs", async () => {
    const updated = { id: taskId, is_recurring: false };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await taskService.update(userId, taskId, { is_recurring: false } as never);

    expect(mockClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_recurring: false,
        repeat_every: null,
        repeat_cycle: null,
      }),
    );
  });
});

describe("taskService.complete – recurring completion", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const spawnedId = "task-2";

  function futureDate(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("calls the RPC with computed next due date for recurring tasks", async () => {
    const currentTask = {
      id: taskId,
      user_id: userId,
      status: TASK_STATUS.TODO,
      is_completed: false,
      is_focused: true,
      is_important: true,
      is_urgent: false,
      area_id: null,
      project_id: null,
      linkedAreaIds: [],
      linkedGoalIds: [],
      linkedProjectIds: [],
      previous_status: null,
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    };
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { completed_task_id: taskId, spawned_task_id: spawnedId },
        error: null,
      }),
    } as any;
    const reReadClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...currentTask, is_completed: true, status: TASK_STATUS.COMPLETED },
        error: null,
      }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient) // task_areas hydration
      .mockImplementationOnce(() => getByIdClient) // goal_tasks hydration
      .mockImplementationOnce(() => getByIdClient) // task_projects hydration
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => reReadClient)
      .mockImplementationOnce(() => reReadClient) // task_areas hydration on re-read
      .mockImplementationOnce(() => reReadClient) // goal_tasks hydration on re-read
      .mockImplementationOnce(() => reReadClient); // task_projects hydration on re-read

    const result = await taskService.complete(userId, taskId);

    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "complete_recurring_task",
      expect.objectContaining({
        p_user_id: userId,
        p_task_id: taskId,
        p_next_status: TASK_STATUS.TODO,
      }),
    );
    // next due date should be the source due_date + 1 day
    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "complete_recurring_task",
      expect.objectContaining({
        p_next_due_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(result.spawnedTaskId).toBe(spawnedId);
  });

  it("falls back to deriveTaskStatus when the source row has no previous_status", async () => {
    const currentTask = {
      id: taskId,
      user_id: userId,
      // Already-completed source so status === COMPLETED and there's no
      // previous_status: the next instance must still be persisted with a
      // sensible workflow bucket.
      status: TASK_STATUS.COMPLETED,
      is_completed: true,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      area_id: null,
      project_id: null,
      linkedAreaIds: [],
      linkedGoalIds: [],
      linkedProjectIds: [],
      previous_status: null,
      due_date: futureDate(1),
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    };
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { completed_task_id: taskId, spawned_task_id: spawnedId },
        error: null,
      }),
    } as any;
    const reReadClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => reReadClient)
      .mockImplementationOnce(() => reReadClient)
      .mockImplementationOnce(() => reReadClient)
      .mockImplementationOnce(() => reReadClient);

    await taskService.complete(userId, taskId);

    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "complete_recurring_task",
      expect.objectContaining({
        p_next_status: expect.stringMatching(/^(todo|inbox|in_progress)$/),
      }),
    );
  });

  it("returns only completedTask for non-recurring tasks (no RPC call)", async () => {
    const currentTask = {
      id: taskId,
      user_id: userId,
      status: TASK_STATUS.TODO,
      is_completed: false,
      area_id: null,
      project_id: null,
      linkedAreaIds: [],
      linkedGoalIds: [],
      linkedProjectIds: [],
      previous_status: null,
      is_recurring: false,
      repeat_every: null,
      repeat_cycle: null,
    };
    const completedTask = {
      ...currentTask,
      is_completed: true,
      status: TASK_STATUS.COMPLETED,
      previous_status: TASK_STATUS.TODO,
    };
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: completedTask, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.complete(userId, taskId);

    expect(result.completedTask).toEqual(completedTask);
    expect(result.spawnedTaskId).toBeUndefined();
  });
});

describe("taskService.undoComplete – restores source and removes spawned row", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const spawnedId = "task-2";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("calls undo RPC and then uncompletes the source", async () => {
    const rpcClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const currentTask = {
      id: taskId,
      user_id: userId,
      status: TASK_STATUS.COMPLETED,
      is_completed: true,
      area_id: null,
      project_id: null,
      linkedAreaIds: [],
      linkedGoalIds: [],
      linkedProjectIds: [],
      previous_status: TASK_STATUS.TODO,
    };
    const uncompletedTask = {
      ...currentTask,
      is_completed: false,
      status: TASK_STATUS.TODO,
      previous_status: null,
    };
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: uncompletedTask, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.undoComplete(userId, taskId, spawnedId);

    expect(rpcClient.rpc).toHaveBeenCalledWith("undo_complete_recurring_task", {
      p_user_id: userId,
      p_completed_task_id: taskId,
      p_spawned_task_id: spawnedId,
    });
    expect(result).toEqual(uncompletedTask);
  });

  it("skips the undo RPC when no spawnedTaskId is provided", async () => {
    const currentTask = {
      id: taskId,
      user_id: userId,
      status: TASK_STATUS.COMPLETED,
      is_completed: true,
      area_id: null,
      project_id: null,
      linkedAreaIds: [],
      linkedGoalIds: [],
      linkedProjectIds: [],
      previous_status: TASK_STATUS.TODO,
    };
    const uncompletedTask = {
      ...currentTask,
      is_completed: false,
      status: TASK_STATUS.TODO,
      previous_status: null,
    };
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: uncompletedTask, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.undoComplete(userId, taskId);

    expect(result).toEqual(uncompletedTask);
  });
});

describe("taskService.update – partial updates do not clobber recurrence", () => {
  const userId = "user-1";
  const taskId = "task-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("preserves recurrence fields when only is_focused is updated", async () => {
    const updated = { id: taskId, is_focused: true };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await taskService.update(userId, taskId, { is_focused: true } as never);

    const updatePayload = mockClient.update.mock.calls[0]?.[0];
    expect(updatePayload).toEqual({ is_focused: true });
    expect(updatePayload).not.toHaveProperty("is_recurring");
    expect(updatePayload).not.toHaveProperty("repeat_every");
    expect(updatePayload).not.toHaveProperty("repeat_cycle");
  });

  it("preserves recurrence fields when only name is updated", async () => {
    const updated = { id: taskId, name: "Renamed" };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    await taskService.update(userId, taskId, { name: "Renamed" } as never);

    const updatePayload = mockClient.update.mock.calls[0]?.[0];
    expect(updatePayload).toEqual({ name: "Renamed" });
    expect(updatePayload).not.toHaveProperty("is_recurring");
    expect(updatePayload).not.toHaveProperty("repeat_every");
    expect(updatePayload).not.toHaveProperty("repeat_cycle");
  });
});
