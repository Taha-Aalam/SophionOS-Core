import { z } from "zod";

import { createClient } from "../supabase/client";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "../types/domain.types";
import { createResourceSchema, updateResourceSchema } from "../validators/resource.schema";
import { DatabaseError, NotFoundError, ValidationError } from "../api/error-handler";
import type { ResourceStatus } from "../utils/constants";

const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at";

// ─── Area ID helpers ──────────────────────────────────────────────────────────

function dedupeAreaIds(areaIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(areaIds.filter((id): id is string => Boolean(id))));
}

function extractResourceAreaIds<TInput extends { area_id?: string | null; area_ids?: string[] }>(
  input: TInput,
): {
  areaIds: string[] | undefined;
  resourceInput: Omit<TInput, "area_ids">;
} {
  const { area_ids, area_id, ...rest } = input;

  if (area_ids !== undefined && area_ids.length > 0) {
    const normalizedAreaIds = dedupeAreaIds(area_ids);
    return {
      areaIds: normalizedAreaIds,
      resourceInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  if (area_id !== undefined) {
    const normalizedAreaIds = dedupeAreaIds([area_id]);
    return {
      areaIds: normalizedAreaIds.length > 0 ? normalizedAreaIds : undefined,
      resourceInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  return {
    areaIds: undefined,
    resourceInput: { ...rest, area_id } as Omit<TInput, "area_ids">,
  };
}

function isMissingResourceAreasTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof (error as any).code === "string" ? (error as any).code : undefined;
  const message = "message" in error && typeof (error as any).message === "string" ? (error as any).message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("resource_areas") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

function withPrimaryAreaLinks(resources: Resource[]): Resource[] {
  return resources.map((resource) => ({
    ...resource,
    linkedAreaIds: dedupeAreaIds([resource.area_id]),
  }));
}

async function hydrateResourceAreaLinks(resources: Resource[]): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await createClient()
      .from("resource_areas")
      .select("resource_id, area_id")
      .in("resource_id", resourceIds);

    if (result.error) {
      if (isMissingResourceAreasTableError(result.error)) {
        return withPrimaryAreaLinks(resources);
      }
      throw new DatabaseError(result.error.message);
    }

    const areaIdsByResourceId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = areaIdsByResourceId.get(row.resource_id) ?? [];
      current.push(row.area_id);
      areaIdsByResourceId.set(row.resource_id, current);
    }

    return resources.map((resource) => ({
      ...resource,
      linkedAreaIds: dedupeAreaIds([resource.area_id, ...(areaIdsByResourceId.get(resource.id) ?? [])]),
    }));
  } catch (error) {
    if (isMissingResourceAreasTableError(error)) {
      return withPrimaryAreaLinks(resources);
    }
    throw error;
  }
}

// ─── Goal ID helpers ──────────────────────────────────────────────────────────

function extractGoalIds(input: { goal_ids?: string[] }): {
  goalIds: string[] | undefined;
  resourceInput: Omit<typeof input, "goal_ids">;
} {
  const { goal_ids, ...resourceInput } = input;

  return {
    goalIds: goal_ids ? Array.from(new Set(goal_ids)) : undefined,
    resourceInput,
  };
}

// ─── Task ID helpers ──────────────────────────────────────────────────────────

function extractTaskIds(input: { task_ids?: string[] }): {
  taskIds: string[] | undefined;
  resourceInput: Omit<typeof input, "task_ids">;
} {
  const { task_ids, ...resourceInput } = input;

  return {
    taskIds: task_ids ? Array.from(new Set(task_ids)) : undefined,
    resourceInput,
  };
}

function isMissingTaskResourcesTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof (error as any).code === "string" ? (error as any).code : undefined;
  const message = "message" in error && typeof (error as any).message === "string" ? (error as any).message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("task_resources") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

// ─── Hydration helpers ──────────────────────────────────────────────────────────

async function hydrateResourceGoalLinks(resources: Resource[]): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await createClient()
      .from("goal_resources")
      .select("resource_id, goal_id")
      .in("resource_id", resourceIds);

    if (result.error) {
      throw new DatabaseError(result.error.message);
    }

    const goalIdsByResourceId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = goalIdsByResourceId.get(row.resource_id) ?? [];
      current.push(row.goal_id);
      goalIdsByResourceId.set(row.resource_id, current);
    }

    return resources.map((resource) => ({
      ...resource,
      linkedGoalIds: goalIdsByResourceId.get(resource.id) ?? [],
    }));
  } catch (error) {
    throw error;
  }
}

async function hydrateResourceTaskLinks(resources: Resource[]): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await createClient()
      .from("task_resources")
      .select("resource_id, task_id")
      .in("resource_id", resourceIds);

    if (result.error) {
      if (isMissingTaskResourcesTableError(result.error)) {
        return resources.map((r) => ({ ...r, linkedTaskIds: [] }));
      }
      throw new DatabaseError(result.error.message);
    }

    const taskIdsByResourceId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = taskIdsByResourceId.get(row.resource_id) ?? [];
      current.push(row.task_id);
      taskIdsByResourceId.set(row.resource_id, current);
    }

    return resources.map((resource) => ({
      ...resource,
      linkedTaskIds: taskIdsByResourceId.get(resource.id) ?? [],
    }));
  } catch (error) {
    if (isMissingTaskResourcesTableError(error)) {
      return resources.map((r) => ({ ...r, linkedTaskIds: [] }));
    }
    throw error;
  }
}

async function hydrateResourceRelations(resources: Resource[]): Promise<Resource[]> {
  const withAreas = await hydrateResourceAreaLinks(resources);
  const withGoals = await hydrateResourceGoalLinks(withAreas);
  return await hydrateResourceTaskLinks(withGoals);
}

async function hydrateSingleResourceRelations(resource: Resource): Promise<Resource> {
  const [hydrated] = await hydrateResourceRelations([resource]);
  return hydrated;
}

export const resourceService = {
  async list(
    userId: string,
    filters?: {
      status?: ResourceStatus | "all";
      favorite?: boolean;
      areaId?: string;
      projectId?: string;
      topicId?: string;
    },
  ): Promise<Resource[]> {
    let query = createClient()
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.favorite !== undefined) {
      query = query.eq("favorite", filters.favorite);
    }
    if (filters?.areaId) {
      query = query.eq("area_id", filters.areaId);
    }
    if (filters?.projectId) {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters?.topicId) {
      query = query.eq("topic_id", filters.topicId);
    }

    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateResourceRelations(data || []);
  },

  async getById(userId: string, id: string): Promise<Resource> {
    const { data, error } = await createClient()
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Resource", id);
      }
      throw new DatabaseError(error.message);
    }

    return hydrateSingleResourceRelations(data);
  },

  async create(userId: string, input: CreateResourceInput): Promise<Resource> {
    try {
      const validated = createResourceSchema.parse(input);
      const { areaIds, resourceInput: areaCleanedInput } = extractResourceAreaIds(validated);
      const { goalIds, resourceInput: goalCleanedInput } = extractGoalIds(areaCleanedInput);
      const { taskIds, resourceInput } = extractTaskIds(goalCleanedInput);

      const { data, error } = await createClient()
        .from("resources")
        .insert({ ...resourceInput, user_id: userId })
        .select(RESOURCE_SELECT)
        .single();

      if (error) {
        throw new DatabaseError(error.message);
      }

      if (areaIds?.length) {
        await this.replaceAreaLinks(data.id, areaIds);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(data.id, goalIds);
      }

      if (taskIds?.length) {
        await this.replaceTaskLinks(data.id, taskIds);
      }

      return hydrateSingleResourceRelations(data);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async update(userId: string, id: string, input: UpdateResourceInput): Promise<Resource> {
    try {
      const { goal_ids, task_ids, ...rest } = input;
      const goalIds = goal_ids ? Array.from(new Set(goal_ids)) : undefined;
      const taskIds = task_ids ? Array.from(new Set(task_ids)) : undefined;
      const { areaIds, resourceInput: areaCleanedInput } = extractResourceAreaIds(rest);
      const validated = updateResourceSchema.parse(areaCleanedInput);
      const hasResourceUpdates = Object.keys(validated).length > 0;

      const resource = hasResourceUpdates
        ? await (async () => {
            const { data, error } = await createClient()
              .from("resources")
              .update(validated)
              .eq("user_id", userId)
              .eq("id", id)
              .select(RESOURCE_SELECT)
              .single();

            if (error) {
              if (error.code === "PGRST116") {
                throw new NotFoundError("Resource", id);
              }
              throw new DatabaseError(error.message);
            }

            return data;
          })()
        : await (async () => {
            const { data, error } = await createClient()
              .from("resources")
              .select(RESOURCE_SELECT)
              .eq("user_id", userId)
              .eq("id", id)
              .single();

            if (error) {
              if (error.code === "PGRST116") {
                throw new NotFoundError("Resource", id);
              }
              throw new DatabaseError(error.message);
            }

            return data;
          })();

      if (areaIds) {
        await this.replaceAreaLinks(id, areaIds);
      }

      if (goalIds) {
        await this.replaceGoalLinks(id, goalIds);
      }

      if (taskIds) {
        await this.replaceTaskLinks(id, taskIds);
      }

      return hydrateSingleResourceRelations(resource);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async archive(userId: string, id: string): Promise<Resource> {
    const { data, error } = await createClient()
      .from("resources")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("id", id)
      .select(RESOURCE_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Resource", id);
      }
      throw new DatabaseError(error.message);
    }

    return hydrateSingleResourceRelations(data);
  },

  async unarchive(userId: string, id: string): Promise<Resource> {
    const { data, error } = await createClient()
      .from("resources")
      .update({ is_archived: false })
      .eq("user_id", userId)
      .eq("id", id)
      .select(RESOURCE_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Resource", id);
      }
      throw new DatabaseError(error.message);
    }

    return hydrateSingleResourceRelations(data);
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("resources")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async listByArea(userId: string, areaId: string): Promise<Resource[]> {
    return this.list(userId, { areaId });
  },

  async listByProject(userId: string, projectId: string): Promise<Resource[]> {
    return this.list(userId, { projectId });
  },

  async listByTopic(userId: string, topicId: string): Promise<Resource[]> {
    return this.list(userId, { topicId });
  },

  async listFavorites(userId: string): Promise<Resource[]> {
    return this.list(userId, { favorite: true });
  },

  async listArchived(userId: string): Promise<Resource[]> {
    const { data, error } = await createClient()
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", true)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateResourceRelations(data || []);
  },

  async listByGoal(userId: string, goalId: string): Promise<Resource[]> {
    const { data, error } = await createClient()
      .from("goal_resources")
      .select("resource:resources(*)")
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const resources = (data ?? []).map((r) => r.resource as unknown as Resource).filter(Boolean);
    return hydrateResourceRelations(resources);
  },

  async linkToGoal(goalId: string, resourceId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_resources")
      .upsert({ goal_id: goalId, resource_id: resourceId });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async unlinkFromGoal(goalId: string, resourceId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_resources")
      .delete()
      .eq("goal_id", goalId)
      .eq("resource_id", resourceId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async getWithRelations(resourceId: string): Promise<{ goal_ids: string[]; task_ids: string[]; area_ids: string[] }> {
    const [goalResult, taskResult, areaResult] = await Promise.all([
      createClient().from("goal_resources").select("goal_id").eq("resource_id", resourceId),
      createClient().from("task_resources").select("task_id").eq("resource_id", resourceId),
      createClient().from("resource_areas").select("area_id").eq("resource_id", resourceId),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    if (taskResult.error) {
      if (isMissingTaskResourcesTableError(taskResult.error)) {
        return {
          goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
          task_ids: [],
          area_ids: areaResult.error && isMissingResourceAreasTableError(areaResult.error)
            ? []
            : areaResult.data?.map((r) => r.area_id) || [],
        };
      }
      throw new DatabaseError(taskResult.error.message);
    }

    if (areaResult.error) {
      if (isMissingResourceAreasTableError(areaResult.error)) {
        return {
          goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
          task_ids: taskResult.data?.map((r) => r.task_id) || [],
          area_ids: [],
        };
      }
      throw new DatabaseError(areaResult.error.message);
    }

    return {
      goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
      task_ids: taskResult.data?.map((r) => r.task_id) || [],
      area_ids: areaResult.data?.map((r) => r.area_id) || [],
    };
  },

  async replaceGoalLinks(resourceId: string, goalIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(resourceId);
    const existingGoalIds = new Set(existingRelations.goal_ids);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingRelations.goal_ids.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("goal_resources")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, resource_id: resourceId })));

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("goal_resources")
        .delete()
        .eq("resource_id", resourceId)
        .in("goal_id", goalIdsToRemove);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async replaceAreaLinks(resourceId: string, areaIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(resourceId);
    const existingAreaIds = new Set(existingRelations.area_ids);
    const nextAreaIds = new Set(areaIds);
    const areaIdsToAdd = areaIds.filter((areaId) => !existingAreaIds.has(areaId));
    const areaIdsToRemove = existingRelations.area_ids.filter((areaId) => !nextAreaIds.has(areaId));

    if (areaIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("resource_areas")
        .insert(areaIdsToAdd.map((area_id) => ({ area_id, resource_id: resourceId })));

      if (error && !isMissingResourceAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (areaIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("resource_areas")
        .delete()
        .eq("resource_id", resourceId)
        .in("area_id", areaIdsToRemove);

      if (error && !isMissingResourceAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async replaceTaskLinks(resourceId: string, taskIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(resourceId);
    const existingTaskIds = new Set(existingRelations.task_ids);
    const nextTaskIds = new Set(taskIds);
    const taskIdsToAdd = taskIds.filter((taskId) => !existingTaskIds.has(taskId));
    const taskIdsToRemove = existingRelations.task_ids.filter((taskId) => !nextTaskIds.has(taskId));

    if (taskIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("task_resources")
        .insert(taskIdsToAdd.map((task_id) => ({ task_id, resource_id: resourceId })));

      if (error) {
        if (!isMissingTaskResourcesTableError(error)) {
          throw new DatabaseError(error.message);
        }
      }
    }

    if (taskIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("task_resources")
        .delete()
        .eq("resource_id", resourceId)
        .in("task_id", taskIdsToRemove);

      if (error) {
        if (!isMissingTaskResourcesTableError(error)) {
          throw new DatabaseError(error.message);
        }
      }
    }
  },

  async linkToTask(taskId: string, resourceId: string): Promise<void> {
    const { error } = await createClient()
      .from("task_resources")
      .upsert({ task_id: taskId, resource_id: resourceId });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async unlinkFromTask(taskId: string, resourceId: string): Promise<void> {
    const { error } = await createClient()
      .from("task_resources")
      .delete()
      .eq("task_id", taskId)
      .eq("resource_id", resourceId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};