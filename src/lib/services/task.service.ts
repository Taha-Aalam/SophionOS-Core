import { z } from "zod";

import { createClient } from "../supabase/client";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/domain.types";
import { createTaskSchema, updateTaskSchema } from "../validators/task.schema";
import { DatabaseError, NotFoundError, ValidationError } from "../api/error-handler";
import { TASK_STATUS, type TaskStatus } from "../utils/constants";

const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at";

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

    return data || [];
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

    return data;
  },

  async create(userId: string, input: CreateTaskInput): Promise<Task> {
    try {
      const validated = createTaskSchema.parse(input);
      const { goalIds, taskInput } = extractGoalIds(validated);
      const { data, error } = await createClient()
        .from("tasks")
        .insert({ ...taskInput, user_id: userId })
        .select(TASK_SELECT)
        .single();

      if (error) {
        throw new DatabaseError(error.message);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(userId, data.id, goalIds);
        return this.touch(userId, data.id);
      }

      return data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      if (e instanceof DatabaseError) {
        throw e;
      }
      if (e instanceof z.ZodError) {
        throw new ValidationError("Validation failed", e.issues);
      }

      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<Task> {
    try {
      const validated = updateTaskSchema.parse(input);
      const { goalIds, taskInput } = extractGoalIds(validated);
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
              if (error.code === "PGRST116") {
                throw new NotFoundError("Task", id);
              }

              throw new DatabaseError(error.message);
            }

            return updatedTask;
          })()
        : await this.getById(userId, id);

      if (goalIds) {
        await this.replaceGoalLinks(userId, id, goalIds);
        return this.touch(userId, id);
      }

      return data;
    } catch (e) {
      if (e instanceof ValidationError) {
        throw e;
      }
      if (e instanceof DatabaseError) {
        throw e;
      }
      if (e instanceof z.ZodError) {
        throw new ValidationError("Validation failed", e.issues);
      }

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
      if (error.code === "PGRST116") {
        throw new NotFoundError("Task", id);
      }

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
    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
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

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
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

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
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
      if (error.code === "PGRST116") {
        throw new NotFoundError("Task", id);
      }

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
      if (error.code === "PGRST116") {
        throw new NotFoundError("Task", id);
      }

      throw new DatabaseError(error.message);
    }

    return data;
  },

  async getWithRelations(_userId: string, id: string): Promise<{ goal_ids: string[] }> {
    const { data, error } = await createClient()
      .from("goal_tasks")
      .select("goal_id")
      .eq("task_id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return { goal_ids: data?.map((relation) => relation.goal_id) ?? [] };
  },

  async replaceGoalLinks(_userId: string, taskId: string, goalIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(_userId, taskId);
    const existingGoalIds = new Set(existingRelations.goal_ids);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingRelations.goal_ids.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("goal_tasks")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, task_id: taskId })));

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("goal_tasks")
        .delete()
        .eq("task_id", taskId)
        .in("goal_id", goalIdsToRemove);

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

    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data ?? []).map((r) => r.task as unknown as Task).filter(Boolean);
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
      if (error.code === "PGRST116") {
        throw new NotFoundError("Task", id);
      }

      throw new DatabaseError(error.message);
    }

    return data;
  },
};
