import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "../supabase/client";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "../types/domain.types";
import { createResourceSchema, updateResourceSchema } from "../validators/resource.schema";
import { DatabaseError, NotFoundError, ValidationError, mapDatabaseError } from "../api/error-handler";
import { LIST_SAFETY_CAP, RESOURCE_STATUS, type ResourceStatus } from "../utils/constants";
import { deriveResourceStatus } from "../utils/status-routing";

type ServiceOptions = { supabase?: SupabaseClient };

const RESOURCE_SELECT =
  "id, user_id, area_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at";

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
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
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

async function hydrateResourceAreaLinks(
  resources: Resource[],
  sb: SupabaseClient,
): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await sb
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

// ─── Project ID helpers ───────────────────────────────────────────────────────

function extractProjectIds(input: { project_ids?: string[] }): {
  projectIds: string[] | undefined;
  resourceInput: Omit<typeof input, "project_ids">;
} {
  const { project_ids, ...resourceInput } = input;

  return {
    projectIds: project_ids ? Array.from(new Set(project_ids)) : undefined,
    resourceInput,
  };
}

function isMissingResourceProjectsTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42P01" ||
    (normalizedMessage.includes("resource_projects") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

function isMissingTaskResourcesTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
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

async function hydrateResourceGoalLinks(
  resources: Resource[],
  sb: SupabaseClient,
): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await sb
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

async function hydrateResourceTaskLinks(
  resources: Resource[],
  sb: SupabaseClient,
): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await sb
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

async function hydrateResourceProjectLinks(
  resources: Resource[],
  sb: SupabaseClient,
): Promise<Resource[]> {
  if (resources.length === 0) return resources;

  const resourceIds = resources.map((r) => r.id);

  try {
    const result = await sb
      .from("resource_projects")
      .select("resource_id, project_id")
      .in("resource_id", resourceIds);

    if (result.error) {
      if (isMissingResourceProjectsTableError(result.error)) {
        return resources.map((r) => ({ ...r, linkedProjectIds: [] }));
      }
      throw new DatabaseError(result.error.message);
    }

    const projectIdsByResourceId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = projectIdsByResourceId.get(row.resource_id) ?? [];
      current.push(row.project_id);
      projectIdsByResourceId.set(row.resource_id, current);
    }

    return resources.map((resource) => ({
      ...resource,
      linkedProjectIds: projectIdsByResourceId.get(resource.id) ?? [],
    }));
  } catch (error) {
    if (isMissingResourceProjectsTableError(error)) {
      return resources.map((r) => ({ ...r, linkedProjectIds: [] }));
    }
    throw error;
  }
}

async function hydrateResourceRelations(
  resources: Resource[],
  sb: SupabaseClient,
): Promise<Resource[]> {
  const withAreas = await hydrateResourceAreaLinks(resources, sb);
  const withGoals = await hydrateResourceGoalLinks(withAreas, sb);
  const withProjects = await hydrateResourceProjectLinks(withGoals, sb);
  return await hydrateResourceTaskLinks(withProjects, sb);
}

async function hydrateSingleResourceRelations(
  resource: Resource,
  sb: SupabaseClient,
): Promise<Resource> {
  const [hydrated] = await hydrateResourceRelations([resource], sb);
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
    options?: ServiceOptions & { offset?: number; limit?: number },
  ): Promise<Resource[]> {
    const sb = options?.supabase ?? createClient();
    let query = sb
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    // Opt-in pagination: a requested page fetches exactly that window;
    // otherwise fall back to the safety cap (unbounded lists are a scaling risk).
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + options.limit - 1);
    } else {
      query = query.limit(LIST_SAFETY_CAP);
    }

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.favorite !== undefined) {
      query = query.eq("favorite", filters.favorite);
    }
    if (filters?.areaId) {
      query = query.eq("area_id", filters.areaId);
    }
    if (filters?.topicId) {
      query = query.eq("topic_id", filters.topicId);
    }

    let data: Resource[] | null = null;
    let error: { message: string } | null = null;

    if (filters?.projectId) {
      // Use junction table to filter by project
      const linkResult = await sb
        .from("resource_projects")
        .select("resource_id")
        .eq("project_id", filters.projectId);
      if (linkResult.error) {
        if (!isMissingResourceProjectsTableError(linkResult.error)) {
          throw new DatabaseError(linkResult.error.message);
        }
      }
      const resourceIds = (linkResult.data ?? []).map((r) => r.resource_id);
      if (resourceIds.length === 0) {
        return hydrateResourceRelations([], sb);
      }
      const result = await query.in("id", resourceIds);
      data = (result.data as Resource[] | null) ?? null;
      error = result.error;
    } else {
      const result = await query;
      data = (result.data as Resource[] | null) ?? null;
      error = result.error;
    }

    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateResourceRelations(data || [], sb);
  },

  async getById(userId: string, id: string, options?: ServiceOptions): Promise<Resource> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
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

    return hydrateSingleResourceRelations(data, sb);
  },

  async create(
    userId: string,
    input: CreateResourceInput,
    options?: ServiceOptions,
  ): Promise<Resource> {
    const sb = options?.supabase ?? createClient();
    try {
      const validated = createResourceSchema.parse(input);
      const { areaIds, resourceInput: areaCleanedInput } = extractResourceAreaIds(validated);
      const { goalIds, resourceInput: goalCleanedInput } = extractGoalIds(areaCleanedInput);
      const { taskIds, resourceInput: taskCleanedInput } = extractTaskIds(goalCleanedInput);
      const { projectIds, resourceInput } = extractProjectIds(taskCleanedInput);

      // Derive status from context, but preserve manual user picks for
      // non-inbox states (active, completed).
      // This matches the edit-flow behaviour (resource.service.ts update).
      const preservesManual =
        validated.status === RESOURCE_STATUS.ACTIVE ||
        validated.status === RESOURCE_STATUS.COMPLETED;
      const derived = deriveResourceStatus({
        area_ids: areaIds,
        project_ids: projectIds,
        goal_ids: goalIds,
        task_ids: taskIds,
        topic_id: validated.topic_id,
      });
      const status = preservesManual ? validated.status ?? derived : derived;

      const { data, error } = await sb
        .from("resources")
        .insert({ ...resourceInput, status, user_id: userId })
        .select(RESOURCE_SELECT)
        .single();

      if (error) {
        throw mapDatabaseError(error);
      }

      if (areaIds?.length) {
        await this.replaceAreaLinks(data.id, areaIds, options);
      }

      if (goalIds?.length) {
        await this.replaceGoalLinks(data.id, goalIds, options);
      }

      if (taskIds?.length) {
        await this.replaceTaskLinks(data.id, taskIds, options);
      }

      if (projectIds?.length) {
        await this.replaceProjectLinks(data.id, projectIds, options);
      }

      return hydrateSingleResourceRelations(data, sb);
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
    input: UpdateResourceInput,
    options?: ServiceOptions,
  ): Promise<Resource> {
    const sb = options?.supabase ?? createClient();
    try {
      const { goal_ids, task_ids, project_ids, ...rest } = input;
      const goalIds = goal_ids ? Array.from(new Set(goal_ids)) : undefined;
      const taskIds = task_ids ? Array.from(new Set(task_ids)) : undefined;
      const projectIds = project_ids ? Array.from(new Set(project_ids)) : undefined;
      const { areaIds, resourceInput: areaCleanedInput } = extractResourceAreaIds(rest);
      const validated = updateResourceSchema.parse(areaCleanedInput);
      const hasResourceUpdates = Object.keys(validated).length > 0;
      const validatedWide = validated as Record<string, unknown> & {
        status?: ResourceStatus;
      };

      // Re-derive the status whenever the resource's context changes. The
      // caller may pass a stale `status` (e.g. the dialog default
      // `to_review`) — the context (area/goal/project/task/topic) is the
      // source of truth for the inbox/to_review split, and a stale bucket
      // should be corrected.
      //
      // Manual picks (active/completed) are always preserved — those
      // statuses represent the user filing the resource away, not an
      // auto-derived bucket.
      //
      // Terminal state (completed) is preserved: once a resource is filed
      // away, inbox logic no longer applies.
      const touchesContext =
        areaIds !== undefined ||
        projectIds !== undefined ||
        goalIds !== undefined ||
        taskIds !== undefined ||
        validatedWide.topic_id !== undefined;
      const preservesTerminal = validatedWide.status === RESOURCE_STATUS.COMPLETED;
      const preservesManual =
        validatedWide.status === RESOURCE_STATUS.ACTIVE ||
        validatedWide.status === RESOURCE_STATUS.COMPLETED;

      if (touchesContext && !preservesManual) {
        const derived = deriveResourceStatus({
          area_ids: areaIds,
          goal_ids: goalIds,
          task_ids: taskIds,
          topic_id: validatedWide.topic_id as string | null | undefined,
          ...(projectIds ? { project_ids: projectIds } : {}),
        });
        if (derived !== validatedWide.status) {
          validatedWide.status = derived;
        }
      }

      const resource = hasResourceUpdates
        ? await (async () => {
            const { data, error } = await sb
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
            const { data, error } = await sb
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

      if (areaIds !== undefined) {
        await this.replaceAreaLinks(id, areaIds, options);
      }

      if (goalIds !== undefined) {
        await this.replaceGoalLinks(id, goalIds, options);
      }

      if (taskIds !== undefined) {
        await this.replaceTaskLinks(id, taskIds, options);
      }

      if (projectIds !== undefined) {
        await this.replaceProjectLinks(id, projectIds, options);
      }

      return hydrateSingleResourceRelations(resource, sb);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof DatabaseError) throw e;
      if (e instanceof z.ZodError) throw new ValidationError("Validation failed", e.issues);
      throw new ValidationError(e instanceof Error ? e.message : "Validation failed");
    }
  },

  async archive(userId: string, id: string, options?: ServiceOptions): Promise<Resource> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
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

    return hydrateSingleResourceRelations(data, sb);
  },

  async unarchive(userId: string, id: string, options?: ServiceOptions): Promise<Resource> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
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

    return hydrateSingleResourceRelations(data, sb);
  },

  async delete(userId: string, id: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("resources")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async listByArea(userId: string, areaId: string, options?: ServiceOptions): Promise<Resource[]> {
    return this.list(userId, { areaId }, options);
  },

  async listByProject(
    userId: string,
    projectId: string,
    options?: ServiceOptions,
  ): Promise<Resource[]> {
    const sb = options?.supabase ?? createClient();
    const linkResult = await sb
      .from("resource_projects")
      .select("resource_id")
      .eq("project_id", projectId);

    if (linkResult.error) {
      if (isMissingResourceProjectsTableError(linkResult.error)) {
        return hydrateResourceRelations([], sb);
      }
      throw new DatabaseError(linkResult.error.message);
    }

    const resourceIds = (linkResult.data ?? []).map((r) => r.resource_id);
    if (resourceIds.length === 0) {
      return hydrateResourceRelations([], sb);
    }

    const { data, error } = await sb
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .in("id", resourceIds)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateResourceRelations(data || [], sb);
  },

  async listByTopic(userId: string, topicId: string, options?: ServiceOptions): Promise<Resource[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateResourceRelations(data || [], sb);
  },

  async listFavorites(userId: string, options?: ServiceOptions): Promise<Resource[]> {
    return this.list(userId, { favorite: true }, options);
  },

  async listArchived(userId: string, options?: ServiceOptions): Promise<Resource[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", true)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }

    return hydrateResourceRelations(data || [], sb);
  },

  async listByGoal(userId: string, goalId: string, options?: ServiceOptions): Promise<Resource[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("goal_resources")
      .select("resource:resources(*)")
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const resources = (data ?? []).map((r) => r.resource as unknown as Resource).filter(Boolean);
    return hydrateResourceRelations(resources, sb);
  },

  async linkToGoal(goalId: string, resourceId: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("goal_resources")
      .upsert({ goal_id: goalId, resource_id: resourceId });

    if (error) {
      throw new DatabaseError(error.message);
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  async unlinkFromGoal(
    goalId: string,
    resourceId: string,
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("goal_resources")
      .delete()
      .eq("goal_id", goalId)
      .eq("resource_id", resourceId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  async linkToTask(taskId: string, resourceId: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("task_resources")
      .upsert({ task_id: taskId, resource_id: resourceId });

    if (error) {
      throw new DatabaseError(error.message);
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  async unlinkFromTask(
    taskId: string,
    resourceId: string,
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("task_resources")
      .delete()
      .eq("task_id", taskId)
      .eq("resource_id", resourceId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  /** Re-derive a resource's status from its current area/project/goal/task/topic context. */
  async syncResourceStatusFromContext(
    resourceId: string,
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const relations = await this.getWithRelations(resourceId, options);
    const { data: resource, error: fetchError } = await sb
      .from("resources")
      .select("status, area_id, topic_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (fetchError) {
      throw new DatabaseError(fetchError.message);
    }
    if (!resource) return;

    // Manual states (active/completed) are preserved: a user who
    // explicitly filed a resource to `active` or `completed` should not
    // have it pulled back to a derived inbox/to_review by a later
    // link/unlink that re-runs the derive.
    if (
      resource.status === RESOURCE_STATUS.ACTIVE ||
      resource.status === RESOURCE_STATUS.COMPLETED
    ) {
      return;
    }

    const derivedStatus = deriveResourceStatus({
      area_id: resource.area_id,
      area_ids: relations.area_ids,
      project_ids: relations.project_ids,
      goal_ids: relations.goal_ids,
      task_ids: relations.task_ids,
      topic_id: resource.topic_id,
    });

    if (derivedStatus !== resource.status) {
      const { error } = await sb
        .from("resources")
        .update({ status: derivedStatus })
        .eq("id", resourceId);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async getWithRelations(
    resourceId: string,
    options?: ServiceOptions,
  ): Promise<{ goal_ids: string[]; task_ids: string[]; area_ids: string[]; project_ids: string[] }> {
    const sb = options?.supabase ?? createClient();
    const [goalResult, taskResult, areaResult, projectResult] = await Promise.all([
      sb.from("goal_resources").select("goal_id").eq("resource_id", resourceId),
      sb.from("task_resources").select("task_id").eq("resource_id", resourceId),
      sb.from("resource_areas").select("area_id").eq("resource_id", resourceId),
      sb.from("resource_projects").select("project_id").eq("resource_id", resourceId),
    ]);

    if (goalResult.error) {
      throw new DatabaseError(goalResult.error.message);
    }

    if (taskResult.error && !isMissingTaskResourcesTableError(taskResult.error)) {
      throw new DatabaseError(taskResult.error.message);
    }

    if (areaResult.error && !isMissingResourceAreasTableError(areaResult.error)) {
      throw new DatabaseError(areaResult.error.message);
    }

    if (projectResult.error && !isMissingResourceProjectsTableError(projectResult.error)) {
      throw new DatabaseError(projectResult.error.message);
    }

    return {
      goal_ids: goalResult.data?.map((r) => r.goal_id) || [],
      task_ids: taskResult.data?.map((r) => r.task_id) || [],
      area_ids: areaResult.data?.map((r) => r.area_id) || [],
      project_ids: projectResult.data?.map((r) => r.project_id) || [],
    };
  },

  async replaceGoalLinks(
    resourceId: string,
    goalIds: string[],
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const existingRelations = await this.getWithRelations(resourceId, options);
    const existingGoalIds = new Set(existingRelations.goal_ids);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingRelations.goal_ids.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await sb
        .from("goal_resources")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, resource_id: resourceId })));

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await sb
        .from("goal_resources")
        .delete()
        .eq("resource_id", resourceId)
        .in("goal_id", goalIdsToRemove);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  async replaceAreaLinks(
    resourceId: string,
    areaIds: string[],
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const existingRelations = await this.getWithRelations(resourceId, options);
    const existingAreaIds = new Set(existingRelations.area_ids);
    const nextAreaIds = new Set(areaIds);
    const areaIdsToAdd = areaIds.filter((areaId) => !existingAreaIds.has(areaId));
    const areaIdsToRemove = existingRelations.area_ids.filter((areaId) => !nextAreaIds.has(areaId));

    if (areaIdsToAdd.length > 0) {
      const { error } = await sb
        .from("resource_areas")
        .insert(areaIdsToAdd.map((area_id) => ({ area_id, resource_id: resourceId })));

      if (error && !isMissingResourceAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (areaIdsToRemove.length > 0) {
      const { error } = await sb
        .from("resource_areas")
        .delete()
        .eq("resource_id", resourceId)
        .in("area_id", areaIdsToRemove);

      if (error && !isMissingResourceAreasTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  async replaceTaskLinks(
    resourceId: string,
    taskIds: string[],
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const existingRelations = await this.getWithRelations(resourceId, options);
    const existingTaskIds = new Set(existingRelations.task_ids);
    const nextTaskIds = new Set(taskIds);
    const taskIdsToAdd = taskIds.filter((taskId) => !existingTaskIds.has(taskId));
    const taskIdsToRemove = existingRelations.task_ids.filter((taskId) => !nextTaskIds.has(taskId));

    if (taskIdsToAdd.length > 0) {
      const { error } = await sb
        .from("task_resources")
        .insert(taskIdsToAdd.map((task_id) => ({ task_id, resource_id: resourceId })));

      if (error) {
        if (!isMissingTaskResourcesTableError(error)) {
          throw new DatabaseError(error.message);
        }
      }
    }

    if (taskIdsToRemove.length > 0) {
      const { error } = await sb
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

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  async replaceProjectLinks(
    resourceId: string,
    projectIds: string[],
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const existingRelations = await this.getWithRelations(resourceId, options);
    const existingProjectIds = new Set(existingRelations.project_ids);
    const nextProjectIds = new Set(projectIds);
    const projectIdsToAdd = projectIds.filter((projectId) => !existingProjectIds.has(projectId));
    const projectIdsToRemove = existingRelations.project_ids.filter(
      (projectId) => !nextProjectIds.has(projectId),
    );

    if (projectIdsToAdd.length > 0) {
      const { error } = await sb
        .from("resource_projects")
        .insert(projectIdsToAdd.map((project_id) => ({ project_id, resource_id: resourceId })));

      if (error && !isMissingResourceProjectsTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    if (projectIdsToRemove.length > 0) {
      const { error } = await sb
        .from("resource_projects")
        .delete()
        .eq("resource_id", resourceId)
        .in("project_id", projectIdsToRemove);

      if (error && !isMissingResourceProjectsTableError(error)) {
        throw new DatabaseError(error.message);
      }
    }

    await this.syncResourceStatusFromContext(resourceId, options);
  },

  /**
   * One-shot backfill: re-derive status for every non-terminal resource
   * whose stored status does not match the value derived from its
   * current context. Terminal state (completed) is preserved.
   */
  async backfillStaleStatuses(userId: string, options?: ServiceOptions): Promise<number> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("resources")
      .select(RESOURCE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .not("status", "in", `(${RESOURCE_STATUS.COMPLETED},${RESOURCE_STATUS.ACTIVE})`);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const resources = data ?? [];
    if (resources.length === 0) return 0;
    const resourceIds = resources.map((r) => r.id);

    // Batch every junction read with a single .in(ids) query instead of four
    // per-row lookups (the old loop was O(rows) round trips). Derive in memory.
    const supabase = createClient();
    const [goalLinks, taskLinks, areaLinks, projectLinks] = await Promise.all([
      supabase.from("goal_resources").select("resource_id, goal_id").in("resource_id", resourceIds),
      supabase.from("task_resources").select("resource_id, task_id").in("resource_id", resourceIds),
      supabase.from("resource_areas").select("resource_id, area_id").in("resource_id", resourceIds),
      supabase.from("resource_projects").select("resource_id, project_id").in("resource_id", resourceIds),
    ]);

    if (goalLinks.error) {
      throw new DatabaseError(goalLinks.error.message);
    }
    if (taskLinks.error && !isMissingTaskResourcesTableError(taskLinks.error)) {
      throw new DatabaseError(taskLinks.error.message);
    }
    if (areaLinks.error && !isMissingResourceAreasTableError(areaLinks.error)) {
      throw new DatabaseError(areaLinks.error.message);
    }
    if (projectLinks.error && !isMissingResourceProjectsTableError(projectLinks.error)) {
      throw new DatabaseError(projectLinks.error.message);
    }

    const goalsByResource = new Map<string, string[]>();
    for (const row of goalLinks.data ?? []) {
      goalsByResource.set(row.resource_id, [...(goalsByResource.get(row.resource_id) ?? []), row.goal_id]);
    }
    const tasksByResource = new Map<string, string[]>();
    for (const row of taskLinks.data ?? []) {
      tasksByResource.set(row.resource_id, [...(tasksByResource.get(row.resource_id) ?? []), row.task_id]);
    }
    const areasByResource = new Map<string, string[]>();
    for (const row of areaLinks.data ?? []) {
      areasByResource.set(row.resource_id, [...(areasByResource.get(row.resource_id) ?? []), row.area_id]);
    }
    const projectsByResource = new Map<string, string[]>();
    for (const row of projectLinks.data ?? []) {
      projectsByResource.set(row.resource_id, [...(projectsByResource.get(row.resource_id) ?? []), row.project_id]);
    }

    // Bucket rows by the status they should become so we can issue ONE update
    // per distinct status instead of one update per row.
    const idsByDerivedStatus = new Map<ResourceStatus, string[]>();
    for (const resource of resources) {
      const derived = deriveResourceStatus({
        area_id: resource.area_id,
        area_ids: areasByResource.get(resource.id) ?? [],
        project_ids: projectsByResource.get(resource.id) ?? [],
        goal_ids: goalsByResource.get(resource.id) ?? [],
        task_ids: tasksByResource.get(resource.id) ?? [],
        topic_id: resource.topic_id,
      });
      if (derived !== resource.status) {
        idsByDerivedStatus.set(derived, [...(idsByDerivedStatus.get(derived) ?? []), resource.id]);
      }
    }

    let fixed = 0;
    for (const [status, ids] of idsByDerivedStatus) {
      const { error: updateError } = await (options?.supabase ?? createClient())
        .from("resources")
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
};