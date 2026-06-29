import { z } from "zod";
import { DatabaseError, NotFoundError, ValidationError } from "../api/error-handler";
import { createClient } from "../supabase/client";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/domain.types";
import { LIST_SAFETY_CAP, TASK_STATUS, type TaskStatus } from "../utils/constants";
import {
  buildCompletePatch,
  buildUncompletePatch,
  resolveTaskCompletionOnUpdate,
} from "../utils/task-completion";
import { deriveTaskStatus } from "../utils/status-routing";
import { computeNextTaskDueDate } from "../utils/task-recurrence";
import { createTaskSchema, updateTaskSchema } from "../validators/task.schema";

export const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, previous_status, smart_priority, is_archived, is_recurring, repeat_every, repeat_cycle, recurrence_source_task_id, created_at, updated_at";

// ─── Area ID helpers ──────────────────────────────────────────────────────────

function dedupeAreaIds(areaIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(areaIds.filter((id): id is string => Boolean(id))));
}

function extractTaskAreaIds<TInput extends { area_id?: string | null; area_ids?: string[] }>(
  input: TInput,
): {
  areaIds: string[] | undefined;
  taskInput: Omit<TInput, "area_ids">;
} {
  const { area_ids, area_id, ...rest } = input;

  // Explicit area_ids (including empty array for clearing all areas) → multi-area mode.
  if (area_ids !== undefined) {
    const normalizedAreaIds = area_ids.length > 0 ? dedupeAreaIds(area_ids) : [];
    return {
      areaIds: normalizedAreaIds,
      taskInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  // Single area_id provided (no area_ids or area_ids is empty).
  if (area_id !== undefined) {
    const normalizedAreaIds = dedupeAreaIds([area_id]);
    return {
      areaIds: normalizedAreaIds.length > 0 ? normalizedAreaIds : undefined,
      taskInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  // Nothing provided — keep area_id off the update payload.
  return {
    areaIds: undefined,
    taskInput: rest as Omit<TInput, "area_ids">,
  };
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes(tableName) &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

function isMissingTaskAreasTableError(error: unknown): boolean {
  return isMissingTableError(error, "task_areas");
}

function isMissingTaskProjectsTableError(error: unknown): boolean {
  return isMissingTableError(error, "task_projects");
}

function withPrimaryAreaLinks(tasks: Task[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    linkedAreaIds: dedupeAreaIds([task.area_id]),
  }));
}

async function hydrateTaskAreaLinks(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;

  const taskIds = tasks.map((t) => t.id);

  try {
    const result = await createClient()
      .from("task_areas")
      .select("task_id, area_id")
      .in("task_id", taskIds);

    if (result.error) {
      if (isMissingTaskAreasTableError(result.error)) {
        return withPrimaryAreaLinks(tasks);
      }
      throw new DatabaseError(result.error.message);
    }

    const areaIdsByTaskId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = areaIdsByTaskId.get(row.task_id) ?? [];
      current.push(row.area_id);
      areaIdsByTaskId.set(row.task_id, current);
    }

    return tasks.map((task) => ({
      ...task,
      linkedAreaIds: dedupeAreaIds([task.area_id, ...(areaIdsByTaskId.get(task.id) ?? [])]),
    }));
  } catch (error) {
    if (isMissingTaskAreasTableError(error)) {
      return withPrimaryAreaLinks(tasks);
    }
    throw error;
  }
}

async function hydrateSingleTaskAreaLinks(task: Task): Promise<Task> {
  const [hydrated] = await hydrateTaskAreaLinks([task]);
  return hydrated;
}

async function hydrateTaskGoalLinks(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;

  const taskIds = tasks.map((t) => t.id);

  const result = await createClient()
    .from("goal_tasks")
    .select("task_id, goal_id")
    .in("task_id", taskIds);

  if (result.error) {
    throw new DatabaseError(result.error.message);
  }

  const goalIdsByTaskId = new Map<string, string[]>();
  for (const row of result.data ?? []) {
    const current = goalIdsByTaskId.get(row.task_id) ?? [];
    current.push(row.goal_id);
    goalIdsByTaskId.set(row.task_id, current);
  }

  return tasks.map((task) => ({
    ...task,
    linkedGoalIds: goalIdsByTaskId.get(task.id) ?? [],
  }));
}

async function hydrateSingleTaskGoalLinks(task: Task): Promise<Task> {
  const [hydrated] = await hydrateTaskGoalLinks([task]);
  return hydrated;
}

function dedupeProjectIds(projectIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(projectIds.filter((id): id is string => Boolean(id))));
}

function withPrimaryProjectLinks(tasks: Task[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    linkedProjectIds: dedupeProjectIds([task.project_id]),
  }));
}

async function hydrateTaskProjectLinks(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;
  const taskIds = tasks.map((task) => task.id);

  try {
    const result = await createClient()
      .from("task_projects")
      .select("task_id, project_id")
      .in("task_id", taskIds);

    if (result.error) {
      if (isMissingTaskProjectsTableError(result.error)) {
        return withPrimaryProjectLinks(tasks);
      }
      throw new DatabaseError(result.error.message);
    }

    const projectIdsByTaskId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = projectIdsByTaskId.get(row.task_id) ?? [];
      current.push(row.project_id);
      projectIdsByTaskId.set(row.task_id, current);
    }

    return tasks.map((task) => ({
      ...task,
      linkedProjectIds: dedupeProjectIds([
        task.project_id,
        ...(projectIdsByTaskId.get(task.id) ?? []),
      ]),
    }));
  } catch (error) {
    if (isMissingTaskProjectsTableError(error)) {
      return withPrimaryProjectLinks(tasks);
    }
    throw error;
  }
}

async function hydrateSingleTaskProjectLinks(task: Task): Promise<Task> {
  const [hydrated] = await hydrateTaskProjectLinks([task]);
  return hydrated;
}

async function parallelHydrateTasks(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;
  const [withAreas, withGoals, withProjects] = await Promise.all([
    hydrateTaskAreaLinks(tasks),
    hydrateTaskGoalLinks(tasks),
    hydrateTaskProjectLinks(tasks),
  ]);
  return withAreas.map((task, i) => ({
    ...task,
    linkedGoalIds: withGoals[i]?.linkedGoalIds ?? [],
    linkedProjectIds: withProjects[i]?.linkedProjectIds ?? [],
  }));
}

// ─── Goal ID helpers ──────────────────────────────────────────────────────────

function extractGoalIds(input: { goal_ids?: string[] }): {
  goalIds: string[] | undefined;
  taskInput: Omit<typeof input, "goal_ids">;
} {
  const { goal_ids, ...taskInput } = input;
  return {
    goalIds: goal_ids ? Array.from(new Set(goal_ids)) : undefined,
    taskInput,
  };
}

// ─── Project ID helpers ───────────────────────────────────────────────────────

function extractTaskProjectIds<
  TInput extends { project_id?: string | null; project_ids?: string[] },
>(
  input: TInput,
): {
  projectIds: string[] | undefined;
  taskInput: Omit<TInput, "project_ids">;
} {
  const { project_ids, project_id, ...rest } = input;

  if (project_ids !== undefined) {
    const normalizedProjectIds = dedupeProjectIds(project_ids);
    return {
      projectIds: normalizedProjectIds,
      taskInput: {
        ...rest,
        project_id: normalizedProjectIds[0] ?? null,
      } as Omit<TInput, "project_ids">,
    };
  }

  if (project_id !== undefined) {
    const normalizedProjectIds = dedupeProjectIds([project_id]);
    return {
      projectIds: normalizedProjectIds.length > 0 ? normalizedProjectIds : undefined,
      taskInput: {
        ...rest,
        project_id: normalizedProjectIds[0] ?? null,
      } as Omit<TInput, "project_ids">,
    };
  }

  return {
    projectIds: undefined,
    taskInput: rest as Omit<TInput, "project_ids">,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** Result of a task completion. `spawnedTaskId` is set only for recurring tasks. */
export interface CompleteTaskResult {
  completedTask: Task;
  spawnedTaskId?: string;
}

export interface ListPageOptions {
  offset?: number;
  limit?: number;
}

export const taskService = {
  async list(userId: string, options?: ListPageOptions): Promise<Task[]> {
    let query = createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    // Opt-in pagination: when a page is requested, fetch exactly that window;
    // otherwise fall back to the safety cap (unbounded lists are a scaling risk).
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + options.limit - 1);
    } else {
      query = query.limit(LIST_SAFETY_CAP);
    }

    const { data, error } = await query;

    if (error) {
      throw new DatabaseError(error.message);
    }

    return parallelHydrateTasks(data || []);
  },

  async listArchived(userId: string): Promise<Task[]> {
    const { data, error } = await createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", true)
      .order("created_at", { ascending: false })
      .limit(LIST_SAFETY_CAP);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return parallelHydrateTasks(data || []);
  },

  async getById(userId: string, id: string): Promise<Task> {
    const { data, error } = await createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Task", id);
      }
      throw new DatabaseError(error.message);
    }

    const taskWithAreas = await hydrateSingleTaskAreaLinks(data);
    const taskWithGoals = await hydrateSingleTaskGoalLinks(taskWithAreas);
    return hydrateSingleTaskProjectLinks(taskWithGoals);
  },

  async create(userId: string, input: CreateTaskInput): Promise<Task> {
    try {
      const validated = createTaskSchema.parse(input);
      const { areaIds, taskInput: areaCleanedInput } = extractTaskAreaIds(validated);
      const { projectIds, taskInput: projectCleanedInput } =
        extractTaskProjectIds(areaCleanedInput);
      const { goalIds, taskInput } = extractGoalIds(projectCleanedInput);
      // Derive status from context, but preserve manual user picks for
      // non-inbox states (todo, in_progress, completed, archived).
      // This matches the edit-flow behaviour (task.service.ts update).
      const preservesManual =
        validated.status === TASK_STATUS.TODO ||
        validated.status === TASK_STATUS.IN_PROGRESS ||
        validated.status === TASK_STATUS.COMPLETED ||
        validated.status === TASK_STATUS.ARCHIVED;
      const derived = deriveTaskStatus({
        area_ids: areaIds,
        goal_ids: goalIds,
        project_ids: projectIds,
        due_date: validated.due_date as string | null | undefined,
      });
      const status = preservesManual ? validated.status ?? derived : derived;
      const isCompleted = status === TASK_STATUS.COMPLETED;
      const completedAt = isCompleted ? new Date().toISOString() : null;

      const { data, error } = await createClient()
        .from("tasks")
        .insert({
          ...taskInput,
          status,
          is_completed: isCompleted,
          completed_at: completedAt,
          user_id: userId,
        })
        .select(TASK_SELECT)
        .single();

      if (error) {
        throw new DatabaseError(error.message);
      }

      const needsTouch = (areaIds?.length ?? 0) > 0 || (goalIds?.length ?? 0) > 0 || (projectIds?.length ?? 0) > 0;

      if (areaIds?.length) {
        await this.replaceAreaLinks(userId, data.id, areaIds);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(userId, data.id, goalIds);
      }

      if (projectIds?.length) {
        await this.replaceProjectLinks(userId, data.id, projectIds);
      }

      if (needsTouch) {
        return this.touch(userId, data.id);
      }

      return data;
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async update(
    userId: string,
    id: string,
    input: UpdateTaskInput,
  ): Promise<Task | CompleteTaskResult> {
    try {
      const validated = updateTaskSchema.parse(input);
      const { areaIds, taskInput: areaCleanedInput } = extractTaskAreaIds(validated);
      const { projectIds, taskInput: projectCleanedInput } =
        extractTaskProjectIds(areaCleanedInput);
      const { goalIds, taskInput } = extractGoalIds(projectCleanedInput);
      const hasTaskUpdates = Object.keys(taskInput).length > 0;
      const taskInputWide = taskInput as Record<string, unknown> & {
        status?: TaskStatus;
        is_completed?: boolean;
        previous_status?: TaskStatus | null;
        completed_at?: string | null;
        is_recurring?: boolean;
        repeat_every?: number | null;
        repeat_cycle?: Task["repeat_cycle"] | null;
      };

      // When the caller turns recurrence off, the DB check constraint
      // requires `repeat_every` and `repeat_cycle` to be null. Null them
      // out explicitly so a single partial update satisfies the invariant.
      if (taskInputWide.is_recurring === false) {
        taskInputWide.repeat_every = null;
        taskInputWide.repeat_cycle = null;
      }

      const touchesCompletion =
        taskInputWide.status !== undefined || taskInputWide.is_completed !== undefined;
      let currentForTransition: Awaited<ReturnType<typeof this.getById>> | null = null;
      if (touchesCompletion) {
        const current = await this.getById(userId, id);
        currentForTransition = current;
        const fallback = deriveTaskStatus({
          area_ids: current.linkedAreaIds,
          goal_ids: current.linkedGoalIds,
          project_ids: current.linkedProjectIds,
          due_date: current.due_date as string | null | undefined,
        });
        const syncPatch = resolveTaskCompletionOnUpdate({
          incomingStatus: taskInputWide.status,
          incomingIsCompleted: taskInputWide.is_completed,
          current: {
            status: current.status,
            is_completed: current.is_completed,
            previous_status: current.previous_status ?? null,
          },
          fallbackStatus: fallback,
          now: new Date().toISOString(),
        });
        Object.assign(taskInputWide, syncPatch);
      }

      // Recurring-aware delegation: when the resolved transition is a
      // completion flip on a recurring row, route through complete() /
      // uncomplete() so the spawn / cleanup RPC pair runs. Non-recurring
      // rows fall through to the in-place patch path below.
      if (currentForTransition) {
        const row = currentForTransition;
        const nowRecurring =
          row.is_recurring && row.repeat_every && row.repeat_cycle;
        const transitionedToCompleted =
          !row.is_completed && taskInputWide.is_completed === true;
        const transitionedFromCompleted =
          row.is_completed && taskInputWide.is_completed === false;

        if (nowRecurring && transitionedToCompleted) {
          return this.complete(userId, id);
        }
        if (nowRecurring && transitionedFromCompleted) {
          return this.uncomplete(userId, id);
        }
      }

      // Re-derive the status whenever the task's context changes. The caller
      // may pass a stale `status` (e.g. the dialog default `todo`) — the
      // context (area/goal/project + due_date) is the source of truth for
      // the inbox/todo split, and a stale bucket should be corrected.
      //
      // Terminal states (completed, archived) are preserved: once a task is
      // done or archived, inbox logic no longer applies.
      const datesChanged = taskInputWide.due_date !== undefined;
      const touchesContext =
        areaIds !== undefined ||
        goalIds !== undefined ||
        projectIds !== undefined ||
        datesChanged;
      const preservesTerminal =
        taskInputWide.status === TASK_STATUS.COMPLETED ||
        taskInputWide.status === TASK_STATUS.ARCHIVED;
      const preservesManual =
        taskInputWide.status === TASK_STATUS.TODO ||
        taskInputWide.status === TASK_STATUS.IN_PROGRESS ||
        taskInputWide.status === TASK_STATUS.COMPLETED ||
        taskInputWide.status === TASK_STATUS.ARCHIVED;

      if (touchesContext && !preservesManual && taskInputWide.is_completed === undefined) {
        const derived = deriveTaskStatus({
          area_ids: areaIds,
          goal_ids: goalIds,
          project_ids: projectIds,
          due_date: taskInputWide.due_date as string | null | undefined,
        });
        if (derived !== taskInputWide.status) {
          taskInputWide.status = derived;
        }
      }

      const data = hasTaskUpdates
        ? await (async () => {
            const { data: updatedTask, error } = await createClient()
              .from("tasks")
              .update(taskInput)
              .eq("user_id", userId)
              .eq("id", id)
              .select(TASK_SELECT)
              .single();

            if (error) {
              if (error.code === "PGRST116") throw new NotFoundError("Task", id);
              throw new DatabaseError(error.message);
            }

            return updatedTask;
          })()
        : await this.getById(userId, id);

      if (areaIds !== undefined) {
        await this.replaceAreaLinks(userId, id, areaIds);
      }

      if (goalIds !== undefined) {
        await this.replaceGoalLinks(userId, id, goalIds);
      }

      if (projectIds !== undefined) {
        await this.replaceProjectLinks(userId, id, projectIds);
      }

      if (areaIds !== undefined || goalIds !== undefined || projectIds !== undefined) {
        return this.touch(userId, id);
      }

      return data;
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async complete(userId: string, id: string): Promise<CompleteTaskResult> {
    const current = await this.getById(userId, id);

    // Non-recurring tasks use the existing direct update path. This keeps
    // the legacy contract (returning just the task) for callers that don't
    // need to know about spawning.
    if (!current.is_recurring || !current.repeat_every || !current.repeat_cycle) {
      const patch = buildCompletePatch(current.status, new Date().toISOString());

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

      return { completedTask: data };
    }

    // Forward-edge guard: if this row already spawned a descendant — in any
    // state (live, completed, archived) — the recurrence chain has moved past
    // it. Re-completing such a row is a historical correction (user
    // unchecked, fixed, re-checked), not a new occurrence; the spawn must
    // not run a second time or the workspace ends up with a duplicate sibling
    // of the chain tip. Polarity is opposite to the `uncomplete()` child
    // lookup: there we look for a *live* child to delete safely; here we look
    // for *any* descendant to prove the chain forked.
    const { data: existingChild, error: childLookupError } = await createClient()
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .eq("recurrence_source_task_id", id)
      .limit(1)
      .maybeSingle();

    if (childLookupError) {
      throw new DatabaseError(childLookupError.message);
    }

    if (existingChild) {
      const patch = buildCompletePatch(current.status, new Date().toISOString());

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

      return { completedTask: data };
    }

    // Recurring completion: atomically mark the source complete and spawn
    // the next instance via the `complete_recurring_task` RPC. The RPC copies
    // area/goal/project links and copies recurrence fields, so the spawned
    // row inherits the source's identity and is linked back to it.
    if (!current.due_date) {
      throw new ValidationError("Recurring task is missing a due_date");
    }

    const nextDueDate = computeNextTaskDueDate(
      current.due_date,
      current.repeat_every,
      current.repeat_cycle,
    );

    // The next instance should keep the source's pre-completion workflow
    // status — not the just-set `completed` status. Fall back through
    // `previous_status` first, then derive from context if the source row
    // somehow lacks both.
    const preCompletionStatus =
      (current.status !== TASK_STATUS.COMPLETED
        ? current.status
        : null) ??
      current.previous_status ??
      deriveTaskStatus({
        area_ids: current.linkedAreaIds,
        goal_ids: current.linkedGoalIds,
        project_ids: current.linkedProjectIds,
        due_date: nextDueDate,
      });

    const { data: rpcResult, error: rpcError } = await createClient()
      .rpc("complete_recurring_task", {
        p_task_id: id,
        p_next_due_date: nextDueDate,
        p_next_status: preCompletionStatus,
      })
      .single();

    if (rpcError) {
      throw new DatabaseError(rpcError.message);
    }

    const completedTask = await this.getById(userId, id);
    const spawnedTaskId =
      rpcResult && typeof rpcResult === "object" && "spawned_task_id" in rpcResult
        ? (rpcResult.spawned_task_id as string | null) ?? undefined
        : undefined;

    return { completedTask, spawnedTaskId };
  },

  /**
   * Undo a completion. For recurring tasks this also removes the spawned
   * next instance via `undo_complete_recurring_task` so the workspace isn't
   * left with a duplicate open task.
   */
  async undoComplete(
    userId: string,
    completedTaskId: string,
    spawnedTaskId?: string,
  ): Promise<Task> {
    if (spawnedTaskId) {
      const { error } = await createClient().rpc("undo_complete_recurring_task", {
        p_completed_task_id: completedTaskId,
        p_spawned_task_id: spawnedTaskId,
      });

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    return this.uncomplete(userId, completedTaskId);
  },

  async getByStatus(userId: string, status: TaskStatus): Promise<Task[]> {
    let query = createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status === TASK_STATUS.ARCHIVED) {
      query = query.eq("is_archived", true);
    } else if (status === TASK_STATUS.COMPLETED) {
      query = query.eq("is_archived", false).eq("is_completed", true);
    } else {
      query = query.eq("is_archived", false).eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw new DatabaseError(error.message);

    return parallelHydrateTasks(data || []);
  },

  async getOverdue(userId: string): Promise<Task[]> {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .lt("due_date", today)
      .eq("is_completed", false)
      .order("due_date", { ascending: true });

    if (error) throw new DatabaseError(error.message);

    return parallelHydrateTasks(data || []);
  },

  async getFocused(userId: string): Promise<Task[]> {
    const { data, error } = await createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .eq("is_focused", true)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (error) throw new DatabaseError(error.message);

    return parallelHydrateTasks(data || []);
  },

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

  async archive(userId: string, id: string): Promise<Task> {
    const { data, error } = await createClient()
      .from("tasks")
      .update({ is_archived: true })
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

  async permanentDelete(userId: string, id: string): Promise<void> {
    // Clean up join table rows first to avoid FK violations
    const areaIds = await this.getAreaLinks(id);
    if (areaIds.length > 0) {
      const { error } = await createClient()
        .from("task_areas")
        .delete()
        .eq("task_id", id);
      if (error && !isMissingTaskAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    const { error: goalError } = await createClient()
      .from("goal_tasks")
      .delete()
      .eq("task_id", id);
    if (goalError) {
      throw new DatabaseError(goalError.message);
    }

    const { error: projectError } = await createClient()
      .from("task_projects")
      .delete()
      .eq("task_id", id);
    if (projectError && !isMissingTaskProjectsTableError(projectError)) {
      throw new DatabaseError(projectError.message);
    }

    const { error } = await createClient()
      .from("tasks")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async restore(userId: string, id: string): Promise<Task> {
    const { data, error } = await createClient()
      .from("tasks")
      .update({ is_archived: false })
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

  async getWithRelations(
    _userId: string,
    id: string,
  ): Promise<{ goal_ids: string[]; area_ids: string[]; project_ids: string[] }> {
    const [goalResult, areaResult, projectResult] = await Promise.all([
      createClient().from("goal_tasks").select("goal_id").eq("task_id", id),
      createClient().from("task_areas").select("area_id").eq("task_id", id),
      createClient().from("task_projects").select("project_id").eq("task_id", id),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    if (areaResult.error) {
      if (!isMissingTaskAreasTableError(areaResult.error)) {
        throw new DatabaseError(areaResult.error.message);
      }
    }

    if (projectResult.error) {
      if (!isMissingTaskProjectsTableError(projectResult.error)) {
        throw new DatabaseError(projectResult.error.message);
      }
    }

    return {
      goal_ids: goalResult.data?.map((r) => r.goal_id) ?? [],
      area_ids: areaResult.error ? [] : (areaResult.data?.map((r) => r.area_id) ?? []),
      project_ids: projectResult.error ? [] : (projectResult.data?.map((r) => r.project_id) ?? []),
    };
  },

  async replaceAreaLinks(_userId: string, taskId: string, areaIds: string[]): Promise<void> {
    const existingAreaIdsList = await this.getAreaLinks(taskId);
    const existingAreaIds = new Set(existingAreaIdsList);
    const nextAreaIds = new Set(areaIds);
    const areaIdsToAdd = areaIds.filter((areaId) => !existingAreaIds.has(areaId));
    const areaIdsToRemove = existingAreaIdsList.filter((areaId) => !nextAreaIds.has(areaId));

    if (areaIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("task_areas")
        .insert(areaIdsToAdd.map((area_id) => ({ area_id, task_id: taskId })));

      if (error && !isMissingTaskAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (areaIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("task_areas")
        .delete()
        .eq("task_id", taskId)
        .in("area_id", areaIdsToRemove);

      if (error && !isMissingTaskAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    await this.syncTaskStatusFromContext(taskId);
  },

  async replaceGoalLinks(_userId: string, taskId: string, goalIds: string[]): Promise<void> {
    const existingGoalIdsList = await this.getGoalLinks(taskId);
    const existingGoalIds = new Set(existingGoalIdsList);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingGoalIdsList.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("goal_tasks")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, task_id: taskId })));

      if (error) throw new DatabaseError(error.message);
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("goal_tasks")
        .delete()
        .eq("task_id", taskId)
        .in("goal_id", goalIdsToRemove);

      if (error) throw new DatabaseError(error.message);
    }

    await this.syncTaskStatusFromContext(taskId);
  },

  async replaceProjectLinks(
    _userId: string,
    taskId: string,
    projectIds: string[],
  ): Promise<void> {
    const existingProjectIdsList = await this.getProjectLinks(taskId);
    const existingProjectIds = new Set(existingProjectIdsList);
    const nextProjectIds = new Set(projectIds);
    const projectIdsToAdd = projectIds.filter(
      (projectId) => !existingProjectIds.has(projectId),
    );
    const projectIdsToRemove = existingProjectIdsList.filter(
      (projectId) => !nextProjectIds.has(projectId),
    );

    if (projectIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("task_projects")
        .insert(projectIdsToAdd.map((project_id) => ({ project_id, task_id: taskId })));

      if (error && !isMissingTaskProjectsTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (projectIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("task_projects")
        .delete()
        .eq("task_id", taskId)
        .in("project_id", projectIdsToRemove);

      if (error && !isMissingTaskProjectsTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    await this.syncTaskStatusFromContext(taskId);
  },

  /** Re-derive a task's status from its current area + goal + project + due_date context. */
  async syncTaskStatusFromContext(taskId: string): Promise<void> {
    const { data: task, error: fetchError } = await createClient()
      .from("tasks")
      .select("status, area_id, project_id, due_date")
      .eq("id", taskId)
      .maybeSingle();

    if (fetchError) {
      throw new DatabaseError(fetchError.message);
    }
    if (!task) return;

    // Terminal states are preserved: a completed/archived task is not
    // pulled back to inbox/todo by a later link/unlink.
    if (
      task.status === TASK_STATUS.TODO ||
      task.status === TASK_STATUS.IN_PROGRESS ||
      task.status === TASK_STATUS.COMPLETED ||
      task.status === TASK_STATUS.ARCHIVED
    ) {
      return;
    }

    const [areaIds, goalIds, projectIds] = await Promise.all([
      this.getAreaLinks(taskId),
      this.getGoalLinks(taskId),
      this.getProjectLinks(taskId),
    ]);

    const derivedStatus = deriveTaskStatus({
      area_id: task.area_id,
      area_ids: areaIds,
      goal_ids: goalIds,
      project_id: task.project_id,
      project_ids: projectIds,
      due_date: task.due_date as string | null | undefined,
    });

    if (derivedStatus !== task.status) {
      const { error } = await createClient()
        .from("tasks")
        .update({ status: derivedStatus })
        .eq("id", taskId);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async listByGoal(userId: string, goalId: string): Promise<Task[]> {
    const { data, error } = await createClient()
      .from("goal_tasks")
      .select("task:tasks(*)")
      .eq("goal_id", goalId);

    if (error) throw new DatabaseError(error.message);

    const tasks = (data ?? []).map((r) => r.task as unknown as Task).filter(Boolean);
    return parallelHydrateTasks(tasks);
  },

  async touch(userId: string, id: string): Promise<Task> {
    const { data, error } = await createClient()
      .from("tasks")
      .update({ updated_at: new Date().toISOString() })
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

  /**
   * One-shot backfill: re-derive status for every non-terminal task that
   * is currently sitting on a stale bucket. Terminal states (completed,
   * archived) are preserved. Used by the inbox page to surface tasks that
   * should already be in the inbox but were created before the
   * caller-supplied status override was wired in.
   *
   * Per-row status updates are issued (not a blanket update to a single
   * value) because the derived status can vary: a task with only a due
   * date should be `todo`, a task with no context should be `inbox`,
   * a task with both a project and a due date is still `todo`, etc.
   */
  async backfillStaleStatuses(userId: string): Promise<number> {
    const { data, error } = await createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .not("status", "in", `(${TASK_STATUS.TODO},${TASK_STATUS.IN_PROGRESS},${TASK_STATUS.COMPLETED},${TASK_STATUS.ARCHIVED})`);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const tasks = data ?? [];
    if (tasks.length === 0) return 0;
    const taskIds = tasks.map((t) => t.id);

    // Batch every junction read with a single .in(ids) query instead of three
    // per-row lookups (the old loop was O(rows) round trips). Derive in memory.
    const supabase = createClient();
    const [areaLinks, goalLinks, projectLinks] = await Promise.all([
      supabase.from("task_areas").select("task_id, area_id").in("task_id", taskIds),
      supabase.from("goal_tasks").select("task_id, goal_id").in("task_id", taskIds),
      supabase.from("task_projects").select("task_id, project_id").in("task_id", taskIds),
    ]);

    if (areaLinks.error && !isMissingTaskAreasTableError(areaLinks.error)) {
      throw new DatabaseError(areaLinks.error.message);
    }
    if (goalLinks.error) {
      throw new DatabaseError(goalLinks.error.message);
    }
    if (projectLinks.error && !isMissingTaskProjectsTableError(projectLinks.error)) {
      throw new DatabaseError(projectLinks.error.message);
    }

    const areasByTask = new Map<string, string[]>();
    for (const row of areaLinks.data ?? []) {
      areasByTask.set(row.task_id, [...(areasByTask.get(row.task_id) ?? []), row.area_id]);
    }
    const goalsByTask = new Map<string, string[]>();
    for (const row of goalLinks.data ?? []) {
      goalsByTask.set(row.task_id, [...(goalsByTask.get(row.task_id) ?? []), row.goal_id]);
    }
    const projectsByTask = new Map<string, string[]>();
    for (const row of projectLinks.data ?? []) {
      projectsByTask.set(row.task_id, [...(projectsByTask.get(row.task_id) ?? []), row.project_id]);
    }

    // Bucket rows by the status they should become so we can issue ONE update
    // per distinct status instead of one update per row.
    const idsByDerivedStatus = new Map<TaskStatus, string[]>();
    for (const task of tasks) {
      const derived = deriveTaskStatus({
        area_id: task.area_id,
        area_ids: areasByTask.get(task.id) ?? [],
        goal_ids: goalsByTask.get(task.id) ?? [],
        project_id: task.project_id,
        project_ids: projectsByTask.get(task.id) ?? [],
        due_date: task.due_date as string | null | undefined,
      });
      if (derived !== task.status) {
        idsByDerivedStatus.set(derived, [...(idsByDerivedStatus.get(derived) ?? []), task.id]);
      }
    }

    let fixed = 0;
    for (const [status, ids] of idsByDerivedStatus) {
      const { error: updateError } = await createClient()
        .from("tasks")
        .update({ status })
        .in("id", ids)
        .eq("user_id", userId);
      if (updateError) {
        throw new DatabaseError(updateError.message);
      }
      fixed += ids.length;
    }

    return fixed;
  },

  async getGoalLinks(taskId: string): Promise<string[]> {
    const { data, error } = await createClient()
      .from("goal_tasks")
      .select("goal_id")
      .eq("task_id", taskId);
    if (error) throw new DatabaseError(error.message);
    return data?.map((r) => r.goal_id) ?? [];
  },

  async getAreaLinks(taskId: string): Promise<string[]> {
    const result = await createClient().from("task_areas").select("area_id").eq("task_id", taskId);
    if (result.error) {
      if (isMissingTaskAreasTableError(result.error)) return [];
      throw new DatabaseError(result.error.message);
    }
    return result.data?.map((r) => r.area_id) ?? [];
  },

  async getProjectLinks(taskId: string): Promise<string[]> {
    const result = await createClient()
      .from("task_projects")
      .select("project_id")
      .eq("task_id", taskId);
    if (result.error) {
      if (isMissingTaskProjectsTableError(result.error)) return [];
      throw new DatabaseError(result.error.message);
    }
    return result.data?.map((r) => r.project_id) ?? [];
  },

  hydrateTaskAreaLinks,
  hydrateTaskGoalLinks,
  hydrateTaskProjectLinks,
};
