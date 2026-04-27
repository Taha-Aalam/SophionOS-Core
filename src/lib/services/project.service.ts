import { createClient } from "../supabase/client";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../types/domain.types";
import { createProjectSchema, updateProjectSchema } from "../validators/project.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import type { ProjectStatus } from "../utils/constants";

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, created_at, updated_at";

function extractGoalIds(input: { goal_ids?: string[] }): {
  goalIds: string[] | undefined;
  projectInput: Omit<typeof input, "goal_ids">;
} {
  const { goal_ids, ...projectInput } = input;

  return {
    goalIds: goal_ids ? Array.from(new Set(goal_ids)) : undefined,
    projectInput,
  };
}

export const projectService = {
  async list(
    userId: string,
    filters?: {
      term?: string;
      priority?: string;
      areaId?: string;
      status?: ProjectStatus | "all";
    },
  ): Promise<Project[]> {
    let query = createClient()
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status === "archived") {
      query = query.eq("is_archived", true);
    } else {
      query = query.eq("is_archived", false);
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
    }
    if (filters?.areaId) {
      query = query.eq("area_id", filters.areaId);
    }
    if (filters?.priority) {
      query = query.eq("priority", filters.priority);
    }
    if (filters?.term) {
      query = query.ilike("name", `%${filters.term}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
  },

  async getById(userId: string, id: string): Promise<Project> {
    const { data, error } = await createClient()
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Project", id);
      }

      throw new DatabaseError(error.message);
    }

    return data;
  },

  async create(userId: string, input: CreateProjectInput): Promise<Project> {
    const validated = createProjectSchema.parse(input);
    const { goalIds, projectInput } = extractGoalIds(validated);

    const { data, error } = await createClient()
      .from("projects")
      .insert({ ...projectInput, user_id: userId })
      .select(PROJECT_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    if (goalIds?.length) {
      await this.replaceGoalLinks(userId, data.id, goalIds);
    }

    return data;
  },

  async update(userId: string, id: string, input: UpdateProjectInput): Promise<Project> {
    const validated = updateProjectSchema.parse(input);
    const { goalIds, projectInput } = extractGoalIds(validated);
    const hasProjectUpdates = Object.keys(projectInput).length > 0;

    const project = hasProjectUpdates
      ? await (async () => {
          const { data, error } = await createClient()
            .from("projects")
            .update(projectInput)
            .eq("user_id", userId)
            .eq("id", id)
            .select(PROJECT_SELECT)
            .single();

          if (error) {
            if (error.code === "PGRST116") {
              throw new NotFoundError("Project", id);
            }

            throw new DatabaseError(error.message);
          }

          return data;
        })()
      : await this.getById(userId, id);

    if (goalIds) {
      await this.replaceGoalLinks(userId, id, goalIds);
    }

    return project;
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("projects")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async archive(userId: string, id: string): Promise<Project> {
    const { data, error } = await createClient()
      .from("projects")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("id", id)
      .select(PROJECT_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Project", id);
      }

      throw new DatabaseError(error.message);
    }

    return data;
  },

  async listByStatus(
    userId: string | undefined,
    status: ProjectStatus | "all",
  ): Promise<Project[]> {
    let query = createClient()
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (status === "archived") {
      query = query.eq("is_archived", true);
    } else {
      query = query.eq("is_archived", false);
      if (status !== "all") {
        query = query.eq("status", status);
      }
    }

    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
  },

  async listByArea(userId: string | undefined, areaId: string): Promise<Project[]> {
    const { data, error } = await createClient()
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId!)
      .eq("area_id", areaId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }

    return data || [];
  },

  async getWithRelations(userId: string, id: string): Promise<{
    goal_ids: string[];
  }> {
    const { data, error } = await createClient()
      .from("goal_projects")
      .select("goal_id")
      .eq("project_id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return { goal_ids: data?.map((r) => r.goal_id) || [] };
  },

  async replaceGoalLinks(userId: string, projectId: string, goalIds: string[]): Promise<void> {
    const existingRelations = await this.getWithRelations(userId, projectId);
    const existingGoalIds = new Set(existingRelations.goal_ids);
    const nextGoalIds = new Set(goalIds);
    const goalIdsToAdd = goalIds.filter((goalId) => !existingGoalIds.has(goalId));
    const goalIdsToRemove = existingRelations.goal_ids.filter((goalId) => !nextGoalIds.has(goalId));

    if (goalIdsToAdd.length > 0) {
      const { error } = await createClient()
        .from("goal_projects")
        .insert(goalIdsToAdd.map((goal_id) => ({ goal_id, project_id: projectId })));

      if (error) {
        throw new DatabaseError(error.message);
      }
    }

    if (goalIdsToRemove.length > 0) {
      const { error } = await createClient()
        .from("goal_projects")
        .delete()
        .eq("project_id", projectId)
        .in("goal_id", goalIdsToRemove);

      if (error) {
        throw new DatabaseError(error.message);
      }
    }
  },

  async linkToGoal(userId: string, projectId: string, goalId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_projects")
      .insert({ project_id: projectId, goal_id: goalId });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async unlinkFromGoal(userId: string, projectId: string, goalId: string): Promise<void> {
    const { error } = await createClient()
      .from("goal_projects")
      .delete()
      .eq("project_id", projectId)
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async listByGoal(userId: string, goalId: string): Promise<Project[]> {
    const { data, error } = await createClient()
      .from("goal_projects")
      .select("project:projects(*)")
      .eq("goal_id", goalId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data ?? []).map((r) => r.project as unknown as Project).filter(Boolean);
  },
};
