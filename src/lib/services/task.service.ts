import { z } from "zod";
import { DatabaseError, NotFoundError, ValidationError } from "../api/error-handler";
import { createClient } from "../supabase/client";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/domain.types";
import { TASK_STATUS, type TaskStatus } from "../utils/constants";
import { createTaskSchema, updateTaskSchema } from "../validators/task.schema";

const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at";

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

  // Explicit area_ids with entries → multi-area mode; set primary from first entry.
  if (area_ids !== undefined && area_ids.length > 0) {
    const normalizedAreaIds = dedupeAreaIds(area_ids);
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

  // Nothing provided — preserve area_id as-is (undefined/null).
  return {
    areaIds: undefined,
    taskInput: { ...rest, area_id } as Omit<TInput, "area_ids">,
  };
}

function isMissingTaskAreasTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("task_areas") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
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

async function parallelHydrateTasks(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;
  const [withAreas, withGoals] = await Promise.all([
    hydrateTaskAreaLinks(tasks),
    hydrateTaskGoalLinks(tasks),
  ]);
  return withAreas.map((task, i) => ({
    ...task,
    linkedGoalIds: withGoals[i]?.linkedGoalIds ?? [],
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

// ─── Service ──────────────────────────────────────────────────────────────────

export const taskService = {
  async list(userId: string): Promise<Task[]> {
    const { data, error } = await createClient()
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

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
    return hydrateSingleTaskGoalLinks(taskWithAreas);
  },

  async create(userId: string, input: CreateTaskInput): Promise<Task> {
    try {
      const validated = createTaskSchema.parse(input);
      const { areaIds, taskInput: areaCleanedInput } = extractTaskAreaIds(validated);
      const { goalIds, taskInput } = extractGoalIds(areaCleanedInput);

      const { data, error } = await createClient()
        .from("tasks")
        .insert({ ...taskInput, user_id: userId })
        .select(TASK_SELECT)
        .single();

      if (error) {
        throw new DatabaseError(error.message);
      }

      const needsTouch = (areaIds?.length ?? 0) > 0 || (goalIds?.length ?? 0) > 0;

      if (areaIds?.length) {
        await this.replaceAreaLinks(userId, data.id, areaIds);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(userId, data.id, goalIds);
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

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<Task> {
    try {
      const validated = updateTaskSchema.parse(input);
      const { areaIds, taskInput: areaCleanedInput } = extractTaskAreaIds(validated);
      const { goalIds, taskInput } = extractGoalIds(areaCleanedInput);
      const hasTaskUpdates = Object.keys(taskInput).length > 0;

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

      const needsTouch = (areaIds?.length ?? 0) > 0 || (goalIds?.length ?? 0) > 0;

      if (areaIds?.length) {
        await this.replaceAreaLinks(userId, id, areaIds);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(userId, id, goalIds);
      }

      if (needsTouch) {
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

  async complete(userId: string, id: string): Promise<Task> {
    const { data, error } = await createClient()
      .from("tasks")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
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
    const { data, error } = await createClient()
      .from("tasks")
      .update({ is_completed: false, completed_at: null })
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

  async getWithRelations(
    _userId: string,
    id: string,
  ): Promise<{ goal_ids: string[]; area_ids: string[] }> {
    const [goalResult, areaResult] = await Promise.all([
      createClient().from("goal_tasks").select("goal_id").eq("task_id", id),
      createClient().from("task_areas").select("area_id").eq("task_id", id),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    if (areaResult.error) {
      if (isMissingTaskAreasTableError(areaResult.error)) {
        return { goal_ids: goalResult.data?.map((r) => r.goal_id) ?? [], area_ids: [] };
      }
      throw new DatabaseError(areaResult.error.message);
    }

    return {
      goal_ids: goalResult.data?.map((r) => r.goal_id) ?? [],
      area_ids: areaResult.data?.map((r) => r.area_id) ?? [],
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

  hydrateTaskAreaLinks,
  hydrateTaskGoalLinks,
};
