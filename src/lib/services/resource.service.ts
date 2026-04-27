import { createClient } from "../supabase/client";
import type { CreateResourceInput, Resource, UpdateResourceInput } from "../types/domain.types";
import { createResourceSchema, updateResourceSchema } from "../validators/resource.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import type { ResourceStatus } from "../utils/constants";

const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at";

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

    const { data, error } = await createClient()
      .from("resources")
      .insert({ ...validated, user_id: userId })
      .select(RESOURCE_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data;
  },

  async update(userId: string, id: string, input: UpdateResourceInput): Promise<Resource> {
    const validated = updateResourceSchema.parse(input);

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
};