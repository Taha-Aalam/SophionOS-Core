# Recurring Task Orphan Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the recurring-task orphan leak. When a user un-checks a recurring task (or the dialog save flips `is_completed`), the previously spawned next instance must be removed, and the same path must be used for both entry points.

**Architecture:** Pointer-driven cleanup at the service layer. `taskService.uncomplete()` looks up the live spawned child by `recurrence_source_task_id` and deletes it via the existing `undo_complete_recurring_task` RPC, then patches the parent. `taskService.update()` detects a recurring completion transition and delegates to `complete()` or `uncomplete()` instead of in-place patching. No schema change, no client tracker.

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres + RPCs), Vitest, React-Query.

**Spec:** `docs/superpowers/specs/2026-06-05-recurring-task-orphan-fix-design.md`

**Test command:** `npm test -- tests/unit/task.service.recurring.test.ts`

**Lint command:** `npm run lint`

---

## File Map

| File | Responsibility | Change |
| --- | --- | --- |
| `src/lib/services/task.service.ts` | Service layer for tasks | Modify `uncomplete()` (recurring-aware lookup + RPC), modify `update()` (delegate to complete/uncomplete on recurring transitions) |
| `tests/unit/task.service.recurring.test.ts` | Service-level recurring tests | Add 7 new tests in 2 new `describe` blocks |
| `src/lib/hooks/use-tasks.ts` | React-Query hooks | No API change; add inline JSDoc on `useUncompleteTask` documenting the new contract |

No migration, no UI page change, no dialog change, no RPC change.

---

## Task 1: `taskService.uncomplete()` — recurring-aware child lookup + cleanup

**Files:**
- Modify: `src/lib/services/task.service.ts:681-705` (the `uncomplete` method)
- Test: `tests/unit/task.service.recurring.test.ts` (add a new `describe` block at the end of the file)

- [ ] **Step 1: Add the failing test for "recurring with live child"**

Append the following `describe` block to the end of `tests/unit/task.service.recurring.test.ts` (after the existing `taskService.undoComplete` block, currently ending around line 700+):

```ts
describe("taskService.uncomplete – recurring-aware child cleanup", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const childId = "task-2";

  function recurringTask(overrides: Record<string, unknown> = {}) {
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
      single: vi.fn().mockResolvedValue({ data: recurringTask(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...recurringTask(), is_completed: false, status: TASK_STATUS.TODO, previous_status: null },
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => childLookupClient) // live child lookup
      .mockImplementationOnce(() => rpcClient)        // undo RPC
      .mockImplementationOnce(() => getByIdClient)    // uncomplete.getById
      .mockImplementationOnce(() => getByIdClient)    // task_areas hydration
      .mockImplementationOnce(() => getByIdClient)    // goal_tasks hydration
      .mockImplementationOnce(() => getByIdClient)    // task_projects hydration
      .mockImplementationOnce(() => updateClient);    // final patch

    const result = await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).toHaveBeenCalledWith("undo_complete_recurring_task", {
      p_user_id: userId,
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
      single: vi.fn().mockResolvedValue({ data: recurringTask(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...recurringTask(), is_completed: false, status: TASK_STATUS.TODO, previous_status: null },
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => childLookupClient)
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("skips the lookup and RPC for non-recurring tasks (fast path)", async () => {
    const rpcClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: recurringTask({ is_recurring: false, repeat_every: null, repeat_cycle: null }),
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
        data: { ...recurringTask({ is_recurring: false, repeat_every: null, repeat_cycle: null }), is_completed: false, status: TASK_STATUS.TODO, previous_status: null },
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => rpcClient) // any RPC call is a fail
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    // Use a direct mock count guard to be sure no client is used for a "from tasks" lookup.
    const fromSpy = vi.fn().mockReturnThis();
    const guardedClient = { ...getByIdClient, from: fromSpy };
    vi.mocked(createClient).mockReset();
    vi.mocked(createClient)
      .mockImplementationOnce(() => guardedClient) // getById for the uncomplete method
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.uncomplete(userId, taskId);

    // No RPC client should have been touched on the non-recurring fast path.
    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("does not call undo RPC when the only child is archived or completed", async () => {
    const childLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // The chain order in the implementation is user_id, recurrence_source_task_id,
      // is_completed, is_archived, limit. Whichever .eq is called with
      // is_archived === false returning the empty list simulates a filtered-out
      // child.
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
      single: vi.fn().mockResolvedValue({ data: recurringTask(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...recurringTask(), is_completed: false, status: TASK_STATUS.TODO, previous_status: null },
        error: null,
      }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => childLookupClient)
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    await taskService.uncomplete(userId, taskId);

    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run:
```bash
npm test -- tests/unit/task.service.recurring.test.ts
```

Expected: the four new tests fail because the current `uncomplete` does not call any RPC and does not look up a child. The existing tests in the file still pass.

- [ ] **Step 3: Implement the recurring-aware `uncomplete`**

In `src/lib/services/task.service.ts`, replace the existing `uncomplete` method (lines 681-705) with the following:

```ts
async uncomplete(userId: string, id: string): Promise<Task> {
  const current = await this.getById(userId, id);

  // Recurring-aware cleanup: if this row has a live spawned child, the
  // cleanup RPC deletes the child and its join rows atomically before we
  // uncomplete the parent. The RPC's own guard (matching the
  // `recurrence_source_task_id` pointer) protects against a wrong id.
  if (current.is_recurring && current.repeat_every && current.repeat_cycle) {
    const { data: child } = await createClient()
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .eq("recurrence_source_task_id", id)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle();

    if (child?.id) {
      const { error } = await createClient().rpc("undo_complete_recurring_task", {
        p_user_id: userId,
        p_completed_task_id: id,
        p_spawned_task_id: child.id,
      });

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  }

  const fallback = deriveTaskStatus({
    area_ids: current.linkedAreaIds,
    goal_ids: current.linkedGoalIds,
    project_ids: current.linkedProjectIds,
    due_date: current.due_date as string | null | undefined,
  });
  const patch = buildUncompletePatch(current.previous_status ?? null, fallback);

  const { data, error } = await createClient()
    .from("tasks")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new NotFoundError("Task", id);
    throw new DatabaseError(error.message);
  }

  return data;
},
```

- [ ] **Step 4: Run the new tests and confirm they pass**

Run:
```bash
npm test -- tests/unit/task.service.recurring.test.ts
```

Expected: the four new tests pass. The pre-existing tests in the file still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/task.service.ts tests/unit/task.service.recurring.test.ts
git -c core.hooksPath=/dev/null commit -m "fix(tasks): delete spawned child when uncompleting recurring task"
```

---

## Task 2: `taskService.update()` — delegate on recurring completion transition

**Files:**
- Modify: `src/lib/services/task.service.ts:404-525` (the `update` method)
- Test: `tests/unit/task.service.recurring.test.ts` (add a new `describe` block at the end of the file)

- [ ] **Step 1: Add the failing tests for the `update` delegation**

Append a new `describe` block to the end of `tests/unit/task.service.recurring.test.ts`:

```ts
describe("taskService.update – recurring completion transition delegation", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const spawnedId = "task-2";

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
    // The current row is the same one we read inside update() AND inside
    // complete(); we return the same fixture for every getById call.
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: recurringRow(), error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const rpcClient = {
      rpc: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { completed_task_id: taskId, spawned_task_id: spawnedId },
        error: null,
      }),
    } as any;

    // update() flow calls: getById (for the touchesCompletion branch),
    // getById x3 (hydration), then the completion path inside complete():
    // getById, hydration x3, rpc, getById, hydration x3.
    vi.mocked(createClient)
      .mockImplementation(() => getByIdClient);
    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => rpcClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient);

    // Use a separate input with is_completed: true. We pass an explicit
    // is_completed: true so resolveTaskCompletionOnUpdate sees a transition.
    const result = await taskService.update(userId, taskId, {
      is_completed: true,
    } as any);

    expect(rpcClient.rpc).toHaveBeenCalledWith(
      "complete_recurring_task",
      expect.objectContaining({
        p_user_id: userId,
        p_task_id: taskId,
      }),
    );
    // complete() returns { completedTask, spawnedTaskId }
    expect((result as any).spawnedTaskId).toBe(spawnedId);
  });

  it("delegates to recurring-aware uncomplete() when is_completed flips false on a recurring row", async () => {
    // The row is already completed, and we are flipping back to false.
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
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: spawnedId }, error: null }),
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
    //   1. getById (touchesCompletion branch)
    //   2. delegated uncomplete() flow:
    //      a. child lookup
    //      b. undo RPC
    //      c. getById (current row)
    //      d. getById x3 (hydration)
    //      e. final update
    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient) // update: getById
      .mockImplementationOnce(() => childLookupClient) // uncomplete: child lookup
      .mockImplementationOnce(() => rpcClient)        // uncomplete: undo RPC
      .mockImplementationOnce(() => getByIdClient)    // uncomplete: getById
      .mockImplementationOnce(() => getByIdClient)    // uncomplete: task_areas
      .mockImplementationOnce(() => getByIdClient)    // uncomplete: goal_tasks
      .mockImplementationOnce(() => getByIdClient)    // uncomplete: task_projects
      .mockImplementationOnce(() => updateClient);    // uncomplete: final update

    const result = await taskService.update(userId, taskId, {
      is_completed: false,
    } as any);

    expect(rpcClient.rpc).toHaveBeenCalledWith("undo_complete_recurring_task", {
      p_user_id: userId,
      p_completed_task_id: taskId,
      p_spawned_task_id: spawnedId,
    });
    // uncomplete() returns a Task directly
    expect(result.is_completed).toBe(false);
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

    // update() flow:
    //   1. getById (touchesCompletion)
    //   2. final update
    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.update(userId, taskId, {
      is_completed: true,
    } as any);

    // No RPC should be invoked on the non-recurring path.
    expect(rpcClient.rpc).not.toHaveBeenCalled();
    expect(result.is_completed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run:
```bash
npm test -- tests/unit/task.service.recurring.test.ts
```

Expected: the three new tests fail. The current `update` does not delegate; it patches in place and the return type does not include `spawnedTaskId`. The Task 1 tests still pass.

- [ ] **Step 3: Implement the delegation in `update`**

In `src/lib/services/task.service.ts`, after the `Object.assign(taskInputWide, syncPatch);` line (currently line 451) and before the `datesChanged` block, add a recurring-aware delegation branch. Specifically, replace the section from line 451 (the `Object.assign` line) up to (but not including) the `// Re-derive the status...` comment block (currently starting around line 454) with:

```ts
      Object.assign(taskInputWide, syncPatch);

      // Recurring-aware delegation: when the resolved transition is a
      // completion flip on a recurring row, route through complete() /
      // uncomplete() so the spawn / cleanup RPC pair runs. Non-recurring
      // rows fall through to the in-place patch path below.
      const nowRecurring =
        current.is_recurring && current.repeat_every && current.repeat_cycle;
      const becameCompleted =
        taskInputWide.is_completed === true ||
        taskInputWide.status === TASK_STATUS.COMPLETED;
      const becameUncompleted =
        taskInputWide.is_completed === false ||
        (taskInputWide.status !== undefined &&
          taskInputWide.status !== TASK_STATUS.COMPLETED);

      if (nowRecurring && becameCompleted) {
        return this.complete(userId, id);
      }
      if (nowRecurring && becameUncompleted) {
        return this.uncomplete(userId, id);
      }
```

- [ ] **Step 4: Widen the `update` return type to `Task | CompleteTaskResult`**

Near the top of the file, define a `CompleteTaskResult` type if it is not already exported from the service module. Search the file for the existing `CompleteTaskResult` (it is the return type of `complete()`). Add the type alias at the top of the file after the imports:

```ts
export type CompleteTaskResult = {
  completedTask: Task;
  spawnedTaskId?: string;
};
```

Then change the `update` method signature from:

```ts
async update(userId: string, id: string, input: UpdateTaskInput): Promise<Task> {
```

to:

```ts
async update(
  userId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<Task | CompleteTaskResult> {
```

- [ ] **Step 5: Run the new tests and confirm they pass**

Run:
```bash
npm test -- tests/unit/task.service.recurring.test.ts
```

Expected: the three new tests pass. All pre-existing tests in the file still pass. If the pre-existing `taskService.undoComplete` tests fail because their mocks are now consumed by the additional `uncomplete` lookups, adjust their `mockImplementationOnce` chains to include the new lookup call — the chain gains at most one extra call for the recurring path.

- [ ] **Step 6: Run the full test suite**

Run:
```bash
npm test
```

Expected: the entire suite passes. If a downstream test fails because the `update` return type widened, adjust the consumer (a single `as Task` cast at the call site is acceptable, but ideally no consumer destructures the result).

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/task.service.ts tests/unit/task.service.recurring.test.ts
git -c core.hooksPath=/dev/null commit -m "fix(tasks): route update() through complete/uncomplete for recurring rows"
```

---

## Task 3: Document `useUncompleteTask` contract

**Files:**
- Modify: `src/lib/hooks/use-tasks.ts:240-285` (the `useUncompleteTask` function)

- [ ] **Step 1: Add an inline JSDoc comment above the function**

In `src/lib/hooks/use-tasks.ts`, directly above the `export function useUncompleteTask()` line, add:

```ts
/**
 * Mark a task as not completed.
 *
 * For recurring tasks, the service layer also deletes the live spawned
 * child (the next instance queued by the most recent `complete()` call) by
 * looking it up via `recurrence_source_task_id`. Callers do not need to
 * know the spawned child's id — that is the service's job. This hook
 * supersedes the older "undo via spawnedTaskId" path used by the toast
 * Undo action; the page-level toggle is now safe to use for any
 * uncheck.
 */
```

- [ ] **Step 2: Run the lint check**

Run:
```bash
npm run lint
```

Expected: no new warnings or errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-tasks.ts
git -c core.hooksPath=/dev/null commit -m "docs(tasks): document useUncompleteTask recurring-aware contract"
```

---

## Task 4: Manual verification on the dev server

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server on port 3030**

Run (in the background):
```bash
npm run dev -- --port 3030
```

Expected: server reports "Local: http://localhost:3030" within a few seconds.

- [ ] **Step 2: Reproduce the original bug case**

1. Sign in.
2. Create task `R1` (any area, goal, project; due 2026-06-05; recurring, every 2 days).
3. Mark complete → confirm a new task appears for 2026-06-07.
4. Mark the 2026-06-07 task complete → confirm a new task appears for 2026-06-09.
5. Uncheck the 2026-06-07 task → confirm the 2026-06-09 task is GONE.
6. Re-check the 2026-06-07 task → confirm EXACTLY ONE new task appears for 2026-06-09 (not two).
7. Repeat the uncheck/recheck cycle three more times. Confirm the workspace contains exactly `R1` (one state), the 2026-06-07 row (one state), and exactly one 2026-06-09 row (no duplicates).

- [ ] **Step 3: Verify the dialog save path**

1. With a recurring task open in the edit dialog, tick the "Completed" checkbox in the form and save.
2. Confirm a new task appears for the next due date.
3. Open the dialog again on the just-completed row, un-tick "Completed", and save.
4. Confirm the next-due-date task is gone.

- [ ] **Step 4: Verify non-recurring tasks are unaffected**

1. Create a non-recurring task with the same area/goal/project/due date.
2. Complete and uncheck it twice.
3. Confirm only one row exists in the list (no spawn, no extra deletion).

- [ ] **Step 5: Stop the dev server**

Kill the background `npm run dev` process (Ctrl+C in its terminal, or stop the background task).

- [ ] **Step 6: No code commit expected**

If any step failed, write a failing test that reproduces the failure, fix the code, then commit. Otherwise no commit.

---

## Task 5: `taskService.complete()` — forward-edge guard against re-spawn

**Why this task:** After Tasks 1–2 shipped, a second leak surfaced. When a user un-checks a middle-of-chain row, fixes it, and re-checks it, `complete()` re-ran the spawn RPC. The chain already advanced past that row, so a duplicate sibling of the chain tip appeared. The uncheck path was smart (it left a non-live descendant alone); the re-check path was not.

**Rule:** if the row being completed already has *any* descendant — live, completed, or archived — the recurrence chain has moved past it. Re-completing is a historical correction, not a new occurrence. Patch the row in place; do not spawn.

**Files:**
- Modify: `src/lib/services/task.service.ts` — `complete()` method, just after the `getById` and before the `complete_recurring_task` RPC call
- Test: `tests/unit/task.service.recurring.test.ts` — new `describe("taskService.complete – forward-edge guard")` block plus mock-chain bumps in the existing recurring-complete and delegation tests (each gains one `childLookupClient` slot)

- [x] **Step 1: Insert the forward-edge guard in `complete()`**

Right after the recurring branch's existence check (and before the `due_date` validation that precedes the RPC call), add a lookup on `tasks.recurrence_source_task_id`. The lookup deliberately does NOT filter on `is_completed`/`is_archived` — polarity is opposite to the `uncomplete()` lookup. If a row comes back, run the same in-place patch the non-recurring branch uses and return early with `{ completedTask: data }` (no `spawnedTaskId`).

- [x] **Step 2: Add three forward-edge guard tests**

In `tests/unit/task.service.recurring.test.ts` add a new `describe("taskService.complete – forward-edge guard (re-complete dedupe)")` block with:
  1. live descendant → spawn RPC NOT called, in-place patch runs, `spawnedTaskId` undefined.
  2. existing descendant that is itself completed → spawn RPC still NOT called (proves the lookup is on existence, not state).
  3. lookup DB error → propagated as `DatabaseError`.

- [x] **Step 3: Bump the existing recurring-complete and delegation mock chains**

The new lookup inserts ONE `createClient()` call between the four-call `getById` hydration and the RPC. Every existing test in `taskService.complete – recurring completion` and the `delegates to complete()` case in `taskService.update – recurring completion transition delegation` needs a `childLookupClient` slot inserted at that position (`maybeSingle` returning `{ data: null }` for the no-descendant path).

- [x] **Step 4: Run the tests**

```bash
npx vitest run tests/unit/task.service.recurring.test.ts
npx vitest run tests/unit/task.service.test.ts
```

Expected: all 37 recurring + 11 non-recurring tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/task.service.ts tests/unit/task.service.recurring.test.ts docs/superpowers/plans/2026-06-05-recurring-task-orphan-fix.md
git -c core.hooksPath=/dev/null commit -m "fix(tasks): skip recurring spawn when chain already advanced past this row"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| Service changes — `uncomplete` recurring-aware | Task 1 |
| Service changes — `update` delegates on transition | Task 2 |
| Service changes — `complete` and `undoComplete` unchanged | (no task needed; preserved by not touching them) |
| Hooks — `useUncompleteTask` JSDoc | Task 3 |
| RPC changes — none | (no task needed) |
| Dialog — no form change | (verified by manual test in Task 4) |
| Edge cases — non-recurring fast path | Task 1 test #3, Task 2 test #3 |
| Edge cases — no child lookup | Task 1 test #2 |
| Edge cases — archived/completed child filtered out | Task 1 test #4 |
| Edge cases — multi-tab | out of scope for automated tests; manual reasoning in spec |
| Edge cases — network failure | manual reasoning in spec; out of scope for unit tests |
| Out of scope items | explicitly NOT covered (per spec) |
| Unit tests — 7 scenarios | Tasks 1 & 2 add 7 tests total |
| Integration scenarios — 4 sequences | covered manually in Task 4 |
| Manual | Task 4 |

**Placeholder scan:** no `TBD`/`TODO`/`similar to Task N` in the plan. All code blocks contain complete, copy-pastable code.

**Type consistency:** the `CompleteTaskResult` type is defined in Task 2 Step 4. The `update` signature widens in the same step. No task references a type, function, or method that is not defined in an earlier task.
