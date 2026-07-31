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

  it("auto-derives due_date when enabling recurrence without providing one", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.due_date).toBe(today);
    }
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
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      .mockImplementationOnce(() => childLookupClient) // forward-edge guard
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => reReadClient)
      .mockImplementationOnce(() => reReadClient) // task_areas hydration on re-read
      .mockImplementationOnce(() => reReadClient) // goal_tasks hydration on re-read
      .mockImplementationOnce(() => reReadClient); // task_projects hydration on re-read

    const result = await taskService.complete(userId, taskId);

    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "complete_recurring_task",
      expect.objectContaining({
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
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      .mockImplementationOnce(() => childLookupClient) // forward-edge guard
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

describe("taskService.complete – forward-edge guard (re-complete dedupe)", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const existingChildId = "task-2";

  function recurringRow(overrides: Record<string, unknown> = {}) {
    return {
      id: taskId,
      user_id: userId,
      status: TASK_STATUS.TODO,
      is_completed: false,
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
      repeat_every: 3,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("skips the spawn RPC when a live descendant already exists (re-complete after uncheck)", async () => {
    const rpcClient = { rpc: vi.fn() } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: existingChildId }, error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...recurringRow(), is_completed: true, status: TASK_STATUS.COMPLETED },
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)     // complete.getById
      .mockImplementationOnce(() => getByIdClient)     // area hydrate
      .mockImplementationOnce(() => getByIdClient)     // goal hydrate
      .mockImplementationOnce(() => getByIdClient)     // project hydrate
      .mockImplementationOnce(() => childLookupClient) // forward-edge guard
      .mockImplementationOnce(() => updateClient);     // in-place complete patch

    const result = await taskService.complete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
    expect(updateClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_completed: true, status: TASK_STATUS.COMPLETED }),
    );
    expect(result.spawnedTaskId).toBeUndefined();
    expect(result.completedTask.is_completed).toBe(true);
  });

  it("skips the spawn RPC even when the existing descendant is itself completed (chain tip moved past)", async () => {
    // Real-world chain: R1 → C1 (completed) → C2 (live tip). User unchecks R1,
    // re-checks. C1 still exists, just completed. Forward-edge guard must
    // detect it the same way it would a live child — the lookup is on
    // existence, not state.
    const rpcClient = { rpc: vi.fn() } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: existingChildId }, error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...recurringRow(), is_completed: true, status: TASK_STATUS.COMPLETED },
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => childLookupClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.complete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("propagates DB errors from the forward-edge lookup", async () => {
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "connection lost" },
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => childLookupClient);

    await expect(taskService.complete(userId, taskId)).rejects.toThrow("connection lost");
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

describe("taskService.uncomplete – recurring-aware child cleanup", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const childId = "task-2";

  function recurringRow(overrides: Record<string, unknown> = {}) {
    return {
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
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      ...overrides,
    };
  }

  function uncompletedRow(overrides: Record<string, unknown> = {}) {
    return {
      ...recurringRow(),
      is_completed: false,
      status: TASK_STATUS.TODO,
      previous_status: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("calls undo RPC and patches the parent when a live spawned child exists", async () => {
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: childId }, error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: uncompletedRow(), error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)    // uncomplete.getById
      .mockImplementationOnce(() => getByIdClient)    // task_areas hydration
      .mockImplementationOnce(() => getByIdClient)    // goal_tasks hydration
      .mockImplementationOnce(() => getByIdClient)    // task_projects hydration
      .mockImplementationOnce(() => childLookupClient) // live child lookup
      .mockImplementationOnce(() => rpcClient)        // undo RPC
      .mockImplementationOnce(() => updateClient);    // final patch

    const result = await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).toHaveBeenCalledWith("undo_complete_recurring_task", {
      p_completed_task_id: taskId,
      p_spawned_task_id: childId,
    });
    expect(result.is_completed).toBe(false);
  });

  it("does not call undo RPC when no live spawned child exists", async () => {
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: uncompletedRow(), error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => childLookupClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("skips the lookup and RPC for non-recurring tasks (fast path)", async () => {
    const rpcClient = { rpc: vi.fn() } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: recurringRow({ is_recurring: false, repeat_every: null, repeat_cycle: null }),
        error: null,
      }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: uncompletedRow({ is_recurring: false, repeat_every: null, repeat_cycle: null }),
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("does not call undo RPC when the only child is archived or completed (filtered out)", async () => {
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: uncompletedRow(), error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => childLookupClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });
});

describe("taskService.update – recurring completion transition delegation", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const spawnedId = "task-2";
  const childId = "task-2";

  function recurringRow(overrides: Record<string, unknown> = {}) {
    return {
      id: taskId,
      user_id: userId,
      status: TASK_STATUS.TODO,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      area_id: null,
      project_id: null,
      linkedAreaIds: [],
      linkedGoalIds: [],
      linkedProjectIds: [],
      previous_status: null,
      due_date: "2026-06-05",
      is_recurring: true,
      repeat_every: 2,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("delegates to complete() when is_completed flips true on a recurring row", async () => {
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { completed_task_id: taskId, spawned_task_id: spawnedId },
        error: null,
      }),
    } as any;
    const fallbackGet = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...recurringRow(), is_completed: true, status: TASK_STATUS.COMPLETED },
        error: null,
      }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    // update() flow:
    //   1. getById (touchesCompletion branch) → consumes 4 createClient calls
    //   2. delegates to complete():
    //      a. complete.getById → 4 createClient calls
    //      b. forward-edge child lookup → 1 createClient call
    //      c. RPC → 1 createClient call
    //      d. completedTask re-read → 4 createClient calls
    vi.mocked(createClient)
      .mockImplementation(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient) // update: getById read
      .mockImplementationOnce(() => getByIdClient) // update: area hydrate
      .mockImplementationOnce(() => getByIdClient) // update: goal hydrate
      .mockImplementationOnce(() => getByIdClient) // update: project hydrate
      .mockImplementationOnce(() => getByIdClient) // complete: getById read
      .mockImplementationOnce(() => getByIdClient) // complete: area hydrate
      .mockImplementationOnce(() => getByIdClient) // complete: goal hydrate
      .mockImplementationOnce(() => getByIdClient) // complete: project hydrate
      .mockImplementationOnce(() => childLookupClient) // complete: forward-edge guard
      .mockImplementationOnce(() => rpcClient)     // complete: RPC
      .mockImplementationOnce(() => fallbackGet)   // complete: re-read
      .mockImplementationOnce(() => fallbackGet)   // complete: re-read area hydrate
      .mockImplementationOnce(() => fallbackGet)   // complete: re-read goal hydrate
      .mockImplementationOnce(() => fallbackGet);  // complete: re-read project hydrate

    const result = await taskService.update(userId, taskId, {
      is_completed: true,
    } as never);

    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "complete_recurring_task",
      expect.objectContaining({
        p_task_id: taskId,
      }),
    );
    expect((result as any).spawnedTaskId).toBe(spawnedId);
  });

  it("delegates to recurring-aware uncomplete() when is_completed flips false on a recurring row", async () => {
    const completedRecurring = recurringRow({
      status: TASK_STATUS.COMPLETED,
      is_completed: true,
      previous_status: TASK_STATUS.TODO,
    });
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: completedRecurring, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: childId }, error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...completedRecurring, is_completed: false, status: TASK_STATUS.TODO, previous_status: null },
        error: null,
      }),
    } as any;

    // update() flow:
    //   1. update.getById → 4 createClient calls
    //   2. delegates to uncomplete():
    //      a. uncomplete.getById → 4 createClient calls
    //      b. child lookup → 1 createClient call
    //      c. RPC → 1 createClient call
    //      d. final update → 1 createClient call
    vi.mocked(createClient)
      .mockImplementation(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)   // update: read
      .mockImplementationOnce(() => getByIdClient)   // update: area hydrate
      .mockImplementationOnce(() => getByIdClient)   // update: goal hydrate
      .mockImplementationOnce(() => getByIdClient)   // update: project hydrate
      .mockImplementationOnce(() => getByIdClient)   // uncomplete: read
      .mockImplementationOnce(() => getByIdClient)   // uncomplete: area hydrate
      .mockImplementationOnce(() => getByIdClient)   // uncomplete: goal hydrate
      .mockImplementationOnce(() => getByIdClient)   // uncomplete: project hydrate
      .mockImplementationOnce(() => childLookupClient) // uncomplete: lookup
      .mockImplementationOnce(() => rpcClient)       // uncomplete: RPC
      .mockImplementationOnce(() => updateClient);   // uncomplete: final update

    const result = await taskService.update(userId, taskId, {
      is_completed: false,
    } as never);

    expect(rpcClient.rpc).toHaveBeenCalledWith("undo_complete_recurring_task", {
      p_completed_task_id: taskId,
      p_spawned_task_id: childId,
    });
    expect((result as any).is_completed).toBe(false);
  });

  it("does not delegate on non-recurring rows (existing in-place patch path)", async () => {
    const nonRecurring = recurringRow({
      is_recurring: false,
      repeat_every: null,
      repeat_cycle: null,
    });
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: nonRecurring, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...nonRecurring, is_completed: true, status: TASK_STATUS.COMPLETED, previous_status: TASK_STATUS.TODO },
        error: null,
      }),
    } as any;
    const rpcClient = { rpc: vi.fn() } as any;

    // update() flow for non-recurring completion:
    //   1. update.getById → 4 createClient calls
    //   2. final update → 1 createClient call
    vi.mocked(createClient)
      .mockImplementation(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.update(userId, taskId, {
      is_completed: true,
    } as never);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
    expect((result as any).is_completed).toBe(true);
  });
});

describe("updateTaskSchema – AI-agent-friendly normalization", () => {
  it("normalizes singular repeat_cycle values (day → days)", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 2,
      repeat_cycle: "day",
      due_date: futureDate(1),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.DAYS);
    }
  });

  it("normalizes singular repeat_cycle values (week → weeks)", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: "week",
      due_date: futureDate(1),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.WEEKS);
    }
  });

  it("normalizes singular repeat_cycle values (month → months)", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: "month",
      due_date: futureDate(1),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.MONTHS);
    }
  });

  it("normalizes singular repeat_cycle values (year → years)", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: "year",
      due_date: futureDate(1),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.YEARS);
    }
  });

  it("leaves already-plural values unchanged", () => {
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 2,
      repeat_cycle: TASK_REPEAT_CYCLE.WEEKS,
      due_date: futureDate(1),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.WEEKS);
    }
  });

  it("auto-derives due_date when recurrence is enabled but due_date is missing", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 2,
      repeat_cycle: "weeks",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.due_date).toBe(today);
    }
  });

  it("auto-derives due_date when recurrence is enabled with normalized singular cycle", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = updateTaskSchema.safeParse({
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: "day",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.due_date).toBe(today);
      expect(result.data.repeat_cycle).toBe(TASK_REPEAT_CYCLE.DAYS);
    }
  });
});

describe("taskService.update – AI-agent-friendly recurrence", () => {
  const userId = "user-1";
  const taskId = "task-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it("auto-derives due_date when enabling recurrence without providing it", async () => {
    const updated = { id: taskId, is_recurring: true };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    const today = new Date().toISOString().split("T")[0];
    await taskService.update(userId, taskId, {
      is_recurring: true,
      repeat_every: 2,
      repeat_cycle: "weeks",
    } as never);

    const updatePayload = mockClient.update.mock.calls[0]?.[0];
    expect(updatePayload).toEqual(
      expect.objectContaining({
        is_recurring: true,
        repeat_every: 2,
        repeat_cycle: TASK_REPEAT_CYCLE.WEEKS,
        due_date: today,
      }),
    );
  });

  it("normalizes singular repeat_cycle through the service layer", async () => {
    const updated = { id: taskId, is_recurring: true };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    } as any;
    vi.mocked(createClient).mockImplementation(() => mockClient);

    const today = new Date().toISOString().split("T")[0];
    await taskService.update(userId, taskId, {
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: "day",
    } as never);

    const updatePayload = mockClient.update.mock.calls[0]?.[0];
    expect(updatePayload).toEqual(
      expect.objectContaining({
        is_recurring: true,
        repeat_every: 1,
        repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
        due_date: today,
      }),
    );
  });
});
