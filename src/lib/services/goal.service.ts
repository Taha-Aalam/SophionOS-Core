import { createClient } from "../supabase/client";
import type { CreateGoalInput, Goal, UpdateGoalInput } from "../types/domain.types";
import type { GoalStatusFilter, GoalTermFilter } from "../utils/goals";
import { createGoalSchema, updateGoalSchema } from "../validators/goal.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, created_at, updated_at";

export const goalService = {
  async list(
    userId: string,
    filters: {
      term?: GoalTermFilter;
      priority?: string;
      areaId?: string;
      status?: GoalStatusFilter;
    } = {},
  ): Promise<Goal[]> {
    let query = createClient()
      .from("goals")
      .select(GOAL_SELECT)
      .eq("user_id", userId);

    if (filters.term && filters.term !== "all") {
      query = query.eq("term", filters.term);
    }
    if (filters.priority && filters.priority !== "all") {
      query = query.eq("priority", filters.priority);
    }
    if (filters.areaId) {
      query = query.eq("area_id", filters.areaId);
    }

    if (filters.status === "active") {
      query = query.eq("is_completed", false).eq("is_archived", false);
    } else if (filters.status === "completed") {
      query = query.eq("is_completed", true).eq("is_archived", false);
    } else if (filters.status === "inactive" || filters.status === "archived") {
      query = query.eq("is_archived", true);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
  },

  async getById(userId: string, id: string): Promise<Goal> {
    const { data, error } = await createClient()
      .from("goals")
      .select(GOAL_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Goal", id);
      }

      throw new DatabaseError(error.message);
    }

    return data;
  },

  async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    const validated = createGoalSchema.parse(input);

    const { data, error } = await createClient()
      .from("goals")
      .insert({ ...validated, user_id: userId })
      .select(GOAL_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data;
  },

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<Goal> {
    const validated = updateGoalSchema.parse(input);

    const { data, error } = await createClient()
      .from("goals")
      .update(validated)
      .eq("user_id", userId)
      .eq("id", id)
      .select(GOAL_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Goal", id);
      }

      throw new DatabaseError(error.message);
    }

    return data;
  },

  async countByArea(userId: string, areaId: string): Promise<number> {
    const { count, error } = await createClient()
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("area_id", areaId)
      .eq("is_archived", false);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return count || 0;
  },

  async archive(userId: string, id: string): Promise<Goal> {
    return this.update(userId, id, { is_archived: true });
  },

  async restore(userId: string, id: string): Promise<Goal> {
    return this.update(userId, id, { is_archived: false });
  },
};
