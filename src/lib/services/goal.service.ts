import { createClient } from "../supabase/client";
import type { CreateGoalInput, Goal, UpdateGoalInput } from "../types/domain.types";
import { calculateGoalProgress, type GoalStatusFilter, type GoalTermFilter } from "../utils/goals";
import { createGoalSchema, updateGoalSchema } from "../validators/goal.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import { generateSlug } from "../utils";

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function hydrateGoalProgress(goals: Goal[]): Promise<Goal[]> {
  if (goals.length === 0) {
    return goals;
  }

  const goalIds = goals.map((goal) => goal.id);

  const [{ data: projectLinks, error: projectError }, { data: taskLinks, error: taskError }] =
    await Promise.all([
      createClient()
        .from("goal_projects")
        .select("goal_id, project:projects(status, is_archived)")
        .in("goal_id", goalIds),
      createClient()
        .from("goal_tasks")
        .select("goal_id, task:tasks(is_completed, is_archived)")
        .in("goal_id", goalIds),
    ]);

  if (projectError) {
    throw new DatabaseError(projectError.message);
  }

  if (taskError) {
    throw new DatabaseError(taskError.message);
  }

  const projectsByGoalId = new Map<string, Array<{ is_archived: boolean; status: string }>>();
  for (const link of projectLinks ?? []) {
    if (!link.project) {
      continue;
    }

    const currentProjects = projectsByGoalId.get(link.goal_id) ?? [];
    currentProjects.push(link.project as { is_archived: boolean; status: string });
    projectsByGoalId.set(link.goal_id, currentProjects);
  }

  const tasksByGoalId = new Map<string, Array<{ is_archived: boolean; is_completed: boolean }>>();
  for (const link of taskLinks ?? []) {
    if (!link.task) {
      continue;
    }

    const currentTasks = tasksByGoalId.get(link.goal_id) ?? [];
    currentTasks.push(link.task as { is_archived: boolean; is_completed: boolean });
    tasksByGoalId.set(link.goal_id, currentTasks);
  }

  return goals.map((goal) => ({
    ...goal,
    progress: calculateGoalProgress(
      goal,
      projectsByGoalId.get(goal.id),
      tasksByGoalId.get(goal.id),
    ),
  }));
}

async function hydrateSingleGoalProgress(goal: Goal): Promise<Goal> {
  const [hydratedGoal] = await hydrateGoalProgress([goal]);
  return hydratedGoal;
}

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

    return hydrateGoalProgress(data || []);
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

  async getBySlug(userId: string, slug: string): Promise<Goal> {
    const { data, error } = await createClient()
      .from("goals")
      .select(GOAL_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Goal", slug);
      }
      throw new DatabaseError(error.message);
    }

    return data;
  },

  async getByIdentifier(userId: string, identifier: string): Promise<Goal> {
    try {
      return await this.getBySlug(userId, identifier);
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }

    if (!isUuid(identifier)) {
      throw new NotFoundError("Goal", identifier);
    }

    return this.getById(userId, identifier);
  },

  async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    const validated = createGoalSchema.parse(input);

    const baseSlug = validated.slug ?? generateSlug(validated.name);
    const slug = await this.generateUniqueSlug(userId, baseSlug);

    const { data, error } = await createClient()
      .from("goals")
      .insert({ ...validated, user_id: userId, slug })
      .select(GOAL_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new DatabaseError("Slug collision — please try a different name");
      }
      throw new DatabaseError(error.message);
    }

    return data;
  },

  async generateUniqueSlug(userId: string, baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const exists = await createClient()
        .from("goals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("slug", slug)
        .maybeSingle();

      if (!exists || exists.count === 0) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  },

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<Goal> {
    const validated = updateGoalSchema.parse(input);
    let nextInput = validated;

    if (validated.is_completed === true && validated.progress === undefined) {
      nextInput = { ...validated, progress: 100 };
    } else if (validated.is_completed === false && validated.progress === undefined) {
      const currentGoal = await this.getById(userId, id);
      const reopenedGoal = await hydrateSingleGoalProgress({
        ...currentGoal,
        is_completed: false,
        progress: 0,
      });
      nextInput = {
        ...validated,
        progress: reopenedGoal.progress,
      };
    }

    const { data, error } = await createClient()
      .from("goals")
      .update(nextInput)
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

    return hydrateSingleGoalProgress(data);
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
