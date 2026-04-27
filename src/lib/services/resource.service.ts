import { createClient } from "../supabase/client";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "../types/domain.types";
import { createResourceSchema, updateResourceSchema } from "../validators/resource.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import type { ResourceStatus } from "../utils/constants";

const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at";

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

    return data || [];
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

    return data;
  },

  async create(userId: string, input: CreateResourceInput): Promise<Resource> {
    const validated = createResourceSchema.parse(input);
    const { goalIds, resourceInput } = extractGoalIds(validated);

    const { data, error } = await createClient()
      .from("resources")
      .insert({ ...resourceInput, user_id: userId })
      .select(RESOURCE_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    if (goalIds?.length) {
      await this.replaceGoalLinks(data.id, goalIds);
    }

    return data;
  },

  async update(userId: string, id: string, input: UpdateResourceInput): Promise<Resource> {
    const { goal_ids, ...rest } = input;
    const goalIds = goal_ids ? Array.from(new Set(goal_ids)) : undefined;
    const validated = updateResourceSchema.parse(rest);
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
      : await this.getById(userId, id);

    if (goalIds) {
      await this.replaceGoalLinks(id, goalIds);
    }

    return resource;
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

    return data;
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

    return data || [];
  },

  async listByGoal(userId: string, goalId: string): Promise<Resource[]> {
    const { data, error } = await createClient()
      .from("goal_resources")
      .select("resource:resources(*)")
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data ?? []).map((r) => r.resource as unknown as Resource).filter(Boolean);
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

  async getWithRelations(resourceId: string): Promise<{ goal_ids: string[] }> {
    const { data, error } = await createClient()
      .from("goal_resources")
      .select("goal_id")
      .eq("resource_id", resourceId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return { goal_ids: data?.map((r) => r.goal_id) || [] };
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
};