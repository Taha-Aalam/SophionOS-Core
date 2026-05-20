import { createClient } from "../supabase/client";
import type { CreateGoalInput, Goal, Note, Project, Resource, Task, UpdateGoalInput } from "../types/domain.types";
import {
  calculateGoalProgress,
  goalMatchesAreaId,
  getGoalLinkedAreaIds,
  type GoalStatusFilter,
  type GoalTermFilter,
} from "../utils/goals";
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

function dedupeAreaIds(areaIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(areaIds.filter((areaId): areaId is string => Boolean(areaId))));
}

function isMissingGoalAreasTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  return (
    code === "42P01" ||
    (normalizedMessage.includes("goal_areas") &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("unexpected table") ||
        normalizedMessage.includes("relation")))
  );
}

function withPrimaryAreaLinks(goals: Goal[]): Goal[] {
  return goals.map((goal) => ({
    ...goal,
    linkedAreaIds: dedupeAreaIds([goal.area_id]),
  }));
}

function extractGoalAreaIds<TInput extends { area_id?: string | null; area_ids?: string[] }>(
  input: TInput,
): {
  areaIds: string[] | undefined;
  goalInput: Omit<TInput, "area_ids">;
} {
  const { area_ids, area_id, ...rest } = input;

  if (area_ids !== undefined) {
    const normalizedAreaIds = dedupeAreaIds(area_ids);
    return {
      areaIds: normalizedAreaIds,
      goalInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  if (area_id !== undefined) {
    const normalizedAreaIds = dedupeAreaIds([area_id]);
    return {
      areaIds: normalizedAreaIds,
      goalInput: {
        ...rest,
        area_id: normalizedAreaIds[0] ?? null,
      } as Omit<TInput, "area_ids">,
    };
  }

  return {
    areaIds: undefined,
    goalInput: {
      ...rest,
    } as Omit<TInput, "area_ids">,
  };
}

async function hydrateGoalAreaLinks(goals: Goal[]): Promise<Goal[]> {
  if (goals.length === 0) {
    return goals;
  }

  const goalIds = goals.map((goal) => goal.id);
  let data:
    | Array<{
        goal_id: string;
        area_id: string;
      }>
    | null
    | undefined;

  try {
    const result = await createClient()
      .from("goal_areas")
      .select("goal_id, area_id")
      .in("goal_id", goalIds);

    if (result.error) {
      if (isMissingGoalAreasTableError(result.error)) {
        return withPrimaryAreaLinks(goals);
      }

      throw new DatabaseError(result.error.message);
    }

    data = result.data;
  } catch (error) {
    if (isMissingGoalAreasTableError(error)) {
      return withPrimaryAreaLinks(goals);
    }

    throw error;
  }

  const areaIdsByGoalId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const currentAreaIds = areaIdsByGoalId.get(row.goal_id) ?? [];
    currentAreaIds.push(row.area_id);
    areaIdsByGoalId.set(row.goal_id, currentAreaIds);
  }

  return goals.map((goal) => ({
    ...goal,
    linkedAreaIds: dedupeAreaIds([goal.area_id, ...(areaIdsByGoalId.get(goal.id) ?? [])]),
  }));
}

async function hydrateGoalProgress(goals: Goal[]): Promise<Goal[]> {
  if (goals.length === 0) {
    return goals;
  }

  const goalIds = goals.map((goal) => goal.id);

  const [
    { data: projectLinks, error: projectError },
    { data: taskLinks, error: taskError },
    { data: noteLinks, error: noteError },
    { data: resourceLinks, error: resourceError },
  ] = await Promise.all([
    createClient()
      .from("goal_projects")
      .select("goal_id, project:projects(status, is_archived)")
      .in("goal_id", goalIds),
    createClient()
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived)")
      .in("goal_id", goalIds),
    createClient()
      .from("goal_notes")
      .select("goal_id, note:notes(status, is_archived)")
      .in("goal_id", goalIds),
    createClient()
      .from("goal_resources")
      .select("goal_id, resource:resources(status, is_archived)")
      .in("goal_id", goalIds),
  ]);

  if (projectError) {
    throw new DatabaseError(projectError.message);
  }

  if (taskError) {
    throw new DatabaseError(taskError.message);
  }

  if (noteError) {
    throw new DatabaseError(noteError.message);
  }

  if (resourceError) {
    throw new DatabaseError(resourceError.message);
  }

  const projectsByGoalId = new Map<string, Array<Pick<Project, "is_archived" | "status">>>();
  for (const link of projectLinks ?? []) {
    const linkedProject = Array.isArray(link.project) ? link.project[0] : link.project;
    if (!linkedProject) {
      continue;
    }

    const currentProjects = projectsByGoalId.get(link.goal_id) ?? [];
    currentProjects.push({
      is_archived: linkedProject.is_archived,
      status: linkedProject.status as Project["status"],
    });
    projectsByGoalId.set(link.goal_id, currentProjects);
  }

  const tasksByGoalId = new Map<string, Array<Pick<Task, "is_archived" | "is_completed">>>();
  for (const link of taskLinks ?? []) {
    const linkedTask = Array.isArray(link.task) ? link.task[0] : link.task;
    if (!linkedTask) {
      continue;
    }

    const currentTasks = tasksByGoalId.get(link.goal_id) ?? [];
    currentTasks.push({
      is_archived: linkedTask.is_archived,
      is_completed: linkedTask.is_completed,
    });
    tasksByGoalId.set(link.goal_id, currentTasks);
  }

  const notesByGoalId = new Map<string, Array<Pick<Note, "is_archived" | "status">>>();
  for (const link of noteLinks ?? []) {
    const linkedNote = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!linkedNote) {
      continue;
    }

    const currentNotes = notesByGoalId.get(link.goal_id) ?? [];
    currentNotes.push({
      is_archived: linkedNote.is_archived,
      status: linkedNote.status as Note["status"],
    });
    notesByGoalId.set(link.goal_id, currentNotes);
  }

  const resourcesByGoalId = new Map<string, Array<Pick<Resource, "is_archived" | "status">>>();
  for (const link of resourceLinks ?? []) {
    const linkedResource = Array.isArray(link.resource) ? link.resource[0] : link.resource;
    if (!linkedResource) {
      continue;
    }

    const currentResources = resourcesByGoalId.get(link.goal_id) ?? [];
    currentResources.push({
      is_archived: linkedResource.is_archived,
      status: linkedResource.status as Resource["status"],
    });
    resourcesByGoalId.set(link.goal_id, currentResources);
  }

  return goals.map((goal) => ({
    ...goal,
    progress: calculateGoalProgress(
      goal,
      projectsByGoalId.get(goal.id),
      tasksByGoalId.get(goal.id),
      notesByGoalId.get(goal.id),
      resourcesByGoalId.get(goal.id),
    ),
  }));
}

async function hydrateGoalRollupCounts(goals: Goal[]): Promise<Goal[]> {
  if (goals.length === 0) return goals;
  const goalIds = goals.map((g) => g.id);

  const [
    { data: projectLinks, error: projectError },
    { data: taskLinks, error: taskError },
    { data: noteLinks, error: noteError },
    { data: resourceLinks, error: resourceError },
  ] = await Promise.all([
    createClient()
      .from("goal_projects")
      .select("goal_id, project:projects(status, is_archived)")
      .in("goal_id", goalIds),
    createClient()
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived)")
      .in("goal_id", goalIds),
    createClient()
      .from("goal_notes")
      .select("goal_id, note:notes(status, is_archived)")
      .in("goal_id", goalIds),
    createClient()
      .from("goal_resources")
      .select("goal_id, resource:resources(status, is_archived)")
      .in("goal_id", goalIds),
  ]);

  if (projectError) throw new DatabaseError(projectError.message);
  if (taskError) throw new DatabaseError(taskError.message);
  if (noteError) throw new DatabaseError(noteError.message);
  if (resourceError) throw new DatabaseError(resourceError.message);

  const countFor = (
    links: Array<{ goal_id: string } & Record<string, unknown>> | null,
    goalId: string,
    entityKey: string,
    isActive: (entity: Record<string, unknown>) => boolean,
  ): number =>
    (links ?? []).filter((link) => {
      if (link.goal_id !== goalId) return false;
      const entity = Array.isArray(link[entityKey])
        ? (link[entityKey] as Record<string, unknown>[])[0]
        : (link[entityKey] as Record<string, unknown> | undefined);
      return entity != null && isActive(entity);
    }).length;

  return goals.map((goal) => {
    const id = goal.id;
    return {
      ...goal,
      projectCount: countFor(projectLinks, id, "project", (e) => !e.is_archived && e.status !== "completed"),
      taskCount: countFor(taskLinks, id, "task", (e) => !e.is_archived && !e.is_completed),
      noteCount: countFor(noteLinks, id, "note", (e) => !e.is_archived && e.status !== "archive" && e.status !== "saved"),
      resourceCount: countFor(resourceLinks, id, "resource", (e) => !e.is_archived && e.status !== "saved"),
    };
  });
}

async function hydrateSingleGoalProgress(goal: Goal): Promise<Goal> {
  const [hydratedGoal] = await hydrateGoalProgress([goal]);
  return hydratedGoal;
}

async function hydrateSingleGoalAreaLinks(goal: Goal): Promise<Goal> {
  const [hydratedGoal] = await hydrateGoalAreaLinks([goal]);
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

    const rawGoals = data || [];
    const [goalsWithAreas, goalsWithProgress, goalsWithRollups] = await Promise.all([
      hydrateGoalAreaLinks(rawGoals),
      hydrateGoalProgress(rawGoals),
      hydrateGoalRollupCounts(rawGoals),
    ]);

    let goals = goalsWithAreas.map((goal, i) => ({
      ...goal,
      progress: goalsWithProgress[i]?.progress ?? goal.progress,
      projectCount: goalsWithRollups[i]?.projectCount,
      taskCount: goalsWithRollups[i]?.taskCount,
      noteCount: goalsWithRollups[i]?.noteCount,
      resourceCount: goalsWithRollups[i]?.resourceCount,
    }));

    if (filters.areaId) {
      goals = goals.filter((goal) => goalMatchesAreaId(goal, filters.areaId));
    }

    return goals;
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

    return hydrateSingleGoalAreaLinks(data);
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

    return hydrateSingleGoalAreaLinks(data);
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
    const { areaIds, goalInput } = extractGoalAreaIds(validated);

    const baseSlug = validated.slug ?? generateSlug(validated.name);
    const slug = await this.generateUniqueSlug(userId, baseSlug);

    const { data, error } = await createClient()
      .from("goals")
      .insert({ ...goalInput, user_id: userId, slug })
      .select(GOAL_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new DatabaseError("Slug collision — please try a different name");
      }
      throw new DatabaseError(error.message);
    }

    if (areaIds?.length) {
      await this.replaceAreaLinks(userId, data.id, areaIds);
    }

    return hydrateSingleGoalAreaLinks(data);
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
    const { areaIds, goalInput } = extractGoalAreaIds(validated);
    let nextInput = goalInput;

    if (goalInput.is_completed === true && goalInput.progress === undefined) {
      nextInput = { ...goalInput, progress: 100 };
    } else if (goalInput.is_completed === false && goalInput.progress === undefined) {
      const currentGoal = await this.getById(userId, id);
      const reopenedGoal = await hydrateSingleGoalProgress({
        ...currentGoal,
        is_completed: false,
        progress: 0,
      });
      nextInput = {
        ...goalInput,
        progress: reopenedGoal.progress,
      };
    }

    const hasGoalUpdates = Object.keys(nextInput).length > 0;
    const { data, error } = hasGoalUpdates
      ? await createClient()
          .from("goals")
          .update(nextInput)
          .eq("user_id", userId)
          .eq("id", id)
          .select(GOAL_SELECT)
          .single()
      : { data: await this.getById(userId, id), error: null };

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Goal", id);
      }

      throw new DatabaseError(error.message);
    }

    if (areaIds !== undefined) {
      await this.replaceAreaLinks(userId, id, areaIds);
    }

    return hydrateSingleGoalAreaLinks(await hydrateSingleGoalProgress(data));
  },

  async countByArea(userId: string, areaId: string): Promise<number> {
    const [{ data: primaryGoals, error: primaryError }, { data: linkedGoals, error: linkedError }] =
      await Promise.all([
        createClient()
          .from("goals")
          .select("id")
          .eq("user_id", userId)
          .eq("area_id", areaId)
          .eq("is_archived", false),
        createClient()
          .from("goal_areas")
          .select("goal_id, goal:goals!inner(id, user_id, is_archived)")
          .eq("area_id", areaId),
      ]);

    if (primaryError) {
      throw new DatabaseError(primaryError.message);
    }

    if (linkedError) {
      if (isMissingGoalAreasTableError(linkedError)) {
        return (primaryGoals ?? []).length;
      }

      throw new DatabaseError(linkedError.message);
    }

    const goalIds = new Set((primaryGoals ?? []).map((goal) => goal.id));
    for (const row of linkedGoals ?? []) {
      const linkedGoal = Array.isArray(row.goal) ? row.goal[0] : row.goal;
      if (linkedGoal?.user_id === userId && linkedGoal.is_archived === false) {
        goalIds.add(row.goal_id);
      }
    }

    return goalIds.size;
  },

  async getLinkedAreaIds(goalId: string): Promise<string[]> {
    try {
      const { data, error } = await createClient()
        .from("goal_areas")
        .select("area_id")
        .eq("goal_id", goalId);

      if (error) {
        if (isMissingGoalAreasTableError(error)) {
          const { data: goalData, error: goalError } = await createClient()
            .from("goals")
            .select("area_id")
            .eq("id", goalId)
            .single();

          if (goalError) {
            throw new DatabaseError(goalError.message);
          }

          return dedupeAreaIds([goalData.area_id]);
        }

        throw new DatabaseError(error.message);
      }

      return dedupeAreaIds((data ?? []).map((row) => row.area_id));
    } catch (error) {
      if (isMissingGoalAreasTableError(error)) {
        const { data: goalData, error: goalError } = await createClient()
          .from("goals")
          .select("area_id")
          .eq("id", goalId)
          .single();

        if (goalError) {
          throw new DatabaseError(goalError.message);
        }

        return dedupeAreaIds([goalData.area_id]);
      }

      throw error;
    }
  },

  async replaceAreaLinks(userId: string, goalId: string, areaIds: string[]): Promise<void> {
    const normalizedAreaIds = dedupeAreaIds(areaIds);

    const { error: updateError } = await createClient()
      .from("goals")
      .update({ area_id: normalizedAreaIds[0] ?? null })
      .eq("user_id", userId)
      .eq("id", goalId);

    if (updateError) {
      throw new DatabaseError(updateError.message);
    }

    try {
      const { error: deleteError } = await createClient()
        .from("goal_areas")
        .delete()
        .eq("goal_id", goalId);

      if (deleteError) {
        if (isMissingGoalAreasTableError(deleteError)) {
          return;
        }

        throw new DatabaseError(deleteError.message);
      }
    } catch (error) {
      if (isMissingGoalAreasTableError(error)) {
        return;
      }

      throw error;
    }

    if (normalizedAreaIds.length === 0) {
      return;
    }

    try {
      const { error: insertError } = await createClient()
        .from("goal_areas")
        .insert(
          normalizedAreaIds.map((area_id) => ({
            area_id,
            goal_id: goalId,
          })),
        );

      if (insertError) {
        if (isMissingGoalAreasTableError(insertError)) {
          return;
        }

        throw new DatabaseError(insertError.message);
      }
    } catch (error) {
      if (isMissingGoalAreasTableError(error)) {
        return;
      }

      throw error;
    }
  },

  async linkToArea(userId: string, goalId: string, areaId: string): Promise<Goal> {
    const goal = await this.getById(userId, goalId);
    const nextAreaIds = dedupeAreaIds([...getGoalLinkedAreaIds(goal), areaId]);
    await this.replaceAreaLinks(userId, goalId, nextAreaIds);
    return this.getById(userId, goalId);
  },

  async unlinkFromArea(userId: string, goalId: string, areaId: string): Promise<Goal> {
    const goal = await this.getById(userId, goalId);
    const nextAreaIds = getGoalLinkedAreaIds(goal).filter((linkedAreaId) => linkedAreaId !== areaId);
    await this.replaceAreaLinks(userId, goalId, nextAreaIds);
    return this.getById(userId, goalId);
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("goals")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async archive(userId: string, id: string): Promise<Goal> {
    return this.update(userId, id, { is_archived: true });
  },

  async restore(userId: string, id: string): Promise<Goal> {
    return this.update(userId, id, { is_archived: false });
  },
};
