import type { SupabaseClient } from "@supabase/supabase-js";
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
import { LIST_SAFETY_CAP } from "../utils/constants";

type ServiceOptions = { supabase?: SupabaseClient };

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, is_inactive, slug, created_at, updated_at";

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

async function hydrateGoalAreaLinks(goals: Goal[], sb: SupabaseClient): Promise<Goal[]> {
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
    const result = await sb
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

async function hydrateGoalProgress(goals: Goal[], sb: SupabaseClient): Promise<Goal[]> {
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
    sb
      .from("goal_projects")
      .select("goal_id, project:projects(id, status, is_archived, progress)")
      .in("goal_id", goalIds),
    sb
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived, project_id)")
      .in("goal_id", goalIds),
    sb
      .from("goal_notes")
      .select("goal_id, note:notes(id, status, is_archived, project_id)")
      .in("goal_id", goalIds),
    sb
      .from("goal_resources")
      .select("goal_id, resource:resources(id, status, is_archived)")
      .in("goal_id", goalIds),
  ]);

  if (projectError) throw new DatabaseError(projectError.message);
  if (taskError) throw new DatabaseError(taskError.message);
  if (noteError) throw new DatabaseError(noteError.message);
  if (resourceError) throw new DatabaseError(resourceError.message);

  type ProjectEntry = Pick<Project, "is_archived" | "status" | "progress"> & { id: string };
  type TaskEntry = Pick<Task, "is_archived" | "is_completed" | "project_id">;
  type NoteEntry = Pick<Note, "is_archived" | "status"> & { id: string; project_id: string | null };
  type ResourceEntry = Pick<Resource, "is_archived" | "status"> & {
    id: string;
    linkedProjectIds: string[];
  };

  const projectsByGoalId = new Map<string, ProjectEntry[]>();
  for (const link of projectLinks ?? []) {
    const p = Array.isArray(link.project) ? link.project[0] : link.project;
    if (!p) continue;
    const current = projectsByGoalId.get(link.goal_id) ?? [];
    current.push({
      id: p.id,
      is_archived: p.is_archived,
      status: p.status as Project["status"],
      progress: p.progress,
    });
    projectsByGoalId.set(link.goal_id, current);
  }

  const tasksByGoalId = new Map<string, TaskEntry[]>();
  for (const link of taskLinks ?? []) {
    const t = Array.isArray(link.task) ? link.task[0] : link.task;
    if (!t) continue;
    const current = tasksByGoalId.get(link.goal_id) ?? [];
    current.push({
      is_archived: t.is_archived,
      is_completed: t.is_completed,
      project_id: t.project_id,
    });
    tasksByGoalId.set(link.goal_id, current);
  }

  const notesByGoalId = new Map<string, NoteEntry[]>();
  for (const link of noteLinks ?? []) {
    const n = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!n) continue;
    const current = notesByGoalId.get(link.goal_id) ?? [];
    current.push({
      id: n.id,
      is_archived: n.is_archived,
      status: n.status as Note["status"],
      project_id: n.project_id,
    });
    notesByGoalId.set(link.goal_id, current);
  }

  const resourcesByGoalId = new Map<string, ResourceEntry[]>();
  for (const link of resourceLinks ?? []) {
    const r = Array.isArray(link.resource) ? link.resource[0] : link.resource;
    if (!r) continue;
    const current = resourcesByGoalId.get(link.goal_id) ?? [];
    current.push({
      id: r.id,
      is_archived: r.is_archived,
      status: r.status as Resource["status"],
      linkedProjectIds: [],
    });
    resourcesByGoalId.set(link.goal_id, current);
  }

  // For goal-linked resources: fetch their resource_projects junction entries
  // to detect which goal projects they belong to (for unlinked-item filtering).
  const allResourceIds = [...resourcesByGoalId.values()].flat().map((r) => r.id);
  const resourceProjectIdsByResourceId = new Map<string, Set<string>>();
  if (allResourceIds.length > 0) {
    const { data: resourceProjectData, error: resourceProjectError } = await sb
      .from("resource_projects")
      .select("resource_id, project_id")
      .in("resource_id", allResourceIds);
    if (resourceProjectError && resourceProjectError.code !== "42P01") {
      throw new DatabaseError(resourceProjectError.message);
    }
    for (const row of resourceProjectData ?? []) {
      const set = resourceProjectIdsByResourceId.get(row.resource_id) ?? new Set<string>();
      set.add(row.project_id);
      resourceProjectIdsByResourceId.set(row.resource_id, set);
    }
    for (const entries of resourcesByGoalId.values()) {
      for (const entry of entries) {
        entry.linkedProjectIds = Array.from(
          resourceProjectIdsByResourceId.get(entry.id) ?? [],
        );
      }
    }
  }

  // For goal-linked notes: fetch their note_projects junction entries to detect
  // which goal projects they belong to (for unlinked-item filtering below).
  const allNoteIds = [...notesByGoalId.values()].flat().map((n) => n.id);
  const noteProjectIdsByNoteId = new Map<string, Set<string>>();
  if (allNoteIds.length > 0) {
    const { data: noteProjectData, error: noteProjectError } = await sb
      .from("note_projects")
      .select("note_id, project_id")
      .in("note_id", allNoteIds);
    if (noteProjectError && noteProjectError.code !== "42P01") {
      throw new DatabaseError(noteProjectError.message);
    }
    for (const row of noteProjectData ?? []) {
      const set = noteProjectIdsByNoteId.get(row.note_id) ?? new Set<string>();
      set.add(row.project_id);
      noteProjectIdsByNoteId.set(row.note_id, set);
    }
  }

  // Collect all project IDs across every goal being processed, then fetch ALL
  // tasks/notes/resources for those projects. This gives us live project progress
  // that matches what buildProjectCompletionStats computes on the client — which
  // looks at ALL project items, not just those also linked to the goal.
  const allGoalProjectIds = [
    ...new Set([...projectsByGoalId.values()].flat().map((p) => p.id)),
  ];

  type ProjectItemTask = { is_completed: boolean; is_archived: boolean };
  type ProjectItemNote = { id: string; status: string; is_archived: boolean };
  type ProjectItemResource = { status: string; is_archived: boolean };

  const projectTasksByProjectId = new Map<string, ProjectItemTask[]>();
  const projectNotesByProjectId = new Map<string, ProjectItemNote[]>();
  const projectResourcesByProjectId = new Map<string, ProjectItemResource[]>();

  if (allGoalProjectIds.length > 0) {
    const [
      { data: allProjTasks, error: projTaskError },
      { data: allProjDirectNotes, error: projNoteError },
      { data: allProjNoteJunctions, error: projNoteJunctionError },
      { data: allProjResources, error: projResourceError },
    ] = await Promise.all([
      sb
        .from("tasks")
        .select("project_id, is_completed, is_archived")
        .in("project_id", allGoalProjectIds),
      sb
        .from("notes")
        .select("id, project_id, status, is_archived")
        .in("project_id", allGoalProjectIds),
      sb
        .from("note_projects")
        .select("project_id, note:notes(id, status, is_archived)")
        .in("project_id", allGoalProjectIds),
      sb
        .from("resource_projects")
        .select("project_id, resource:resources(status, is_archived)")
        .in("project_id", allGoalProjectIds),
    ]);

    if (projTaskError) throw new DatabaseError(projTaskError.message);
    if (projNoteError) throw new DatabaseError(projNoteError.message);
    if (projResourceError) throw new DatabaseError(projResourceError.message);
    if (projNoteJunctionError && projNoteJunctionError.code !== "42P01") {
      throw new DatabaseError(projNoteJunctionError.message);
    }

    for (const t of allProjTasks ?? []) {
      if (!t.project_id) continue;
      const arr = projectTasksByProjectId.get(t.project_id) ?? [];
      arr.push({ is_completed: t.is_completed, is_archived: t.is_archived });
      projectTasksByProjectId.set(t.project_id, arr);
    }

    // Build projectNotesByProjectId: first from direct FK, then from junction entries.
    // Track seen note IDs per project to avoid double-counting.
    const seenNotesByProject = new Map<string, Set<string>>();
    for (const n of allProjDirectNotes ?? []) {
      if (!n.project_id) continue;
      const arr = projectNotesByProjectId.get(n.project_id) ?? [];
      const seen = seenNotesByProject.get(n.project_id) ?? new Set<string>();
      if (!seen.has(n.id)) {
        arr.push({ id: n.id, status: n.status as string, is_archived: n.is_archived });
        seen.add(n.id);
      }
      projectNotesByProjectId.set(n.project_id, arr);
      seenNotesByProject.set(n.project_id, seen);
    }
    for (const jlink of allProjNoteJunctions ?? []) {
      const note = Array.isArray(jlink.note) ? jlink.note[0] : jlink.note;
      if (!note || !jlink.project_id) continue;
      const arr = projectNotesByProjectId.get(jlink.project_id) ?? [];
      const seen = seenNotesByProject.get(jlink.project_id) ?? new Set<string>();
      if (!seen.has(note.id)) {
        arr.push({ id: note.id, status: note.status as string, is_archived: note.is_archived });
        seen.add(note.id);
      }
      projectNotesByProjectId.set(jlink.project_id, arr);
      seenNotesByProject.set(jlink.project_id, seen);
    }

    for (const link of allProjResources ?? []) {
      const resource = Array.isArray(link.resource) ? link.resource[0] : link.resource;
      if (!resource || !link.project_id) continue;
      const arr = projectResourcesByProjectId.get(link.project_id) ?? [];
      arr.push({ status: resource.status as string, is_archived: resource.is_archived });
      projectResourcesByProjectId.set(link.project_id, arr);
    }
  }

  return goals.map((goal) => {
    const goalProjects = projectsByGoalId.get(goal.id) ?? [];
    const goalProjectIds = new Set(goalProjects.map((p) => p.id));

    const allTasks = tasksByGoalId.get(goal.id) ?? [];
    const allNotes = notesByGoalId.get(goal.id) ?? [];
    const allResources = resourcesByGoalId.get(goal.id) ?? [];

    // Compute live progress for each project from ALL its items (not just goal-linked
    // ones). This mirrors buildProjectCompletionStats used by project cards in the UI.
    const goalProjectsWithLiveProgress = goalProjects.map((p) => {
      const pTasks = (projectTasksByProjectId.get(p.id) ?? []).filter((t) => !t.is_archived);
      const pNotes = (projectNotesByProjectId.get(p.id) ?? []).filter(
        (n) => !n.is_archived && n.status !== "archive",
      );
      const pResources = (projectResourcesByProjectId.get(p.id) ?? []).filter(
        (r) => !r.is_archived,
      );
      const pTotal = pTasks.length + pNotes.length + pResources.length;
      if (pTotal === 0) {
        return p;
      }
      const pCompleted =
        pTasks.filter((t) => t.is_completed).length +
        pNotes.filter((n) => n.status === "completed").length +
        pResources.filter((r) => r.status === "completed").length;
      return { ...p, progress: Math.round((pCompleted / pTotal) * 100) };
    });

    // "Unlinked" items: goal-linked items NOT covered by any goal-linked project.
    // These count directly in the goal's own progress (not through a project).
    const unlinkedTasks =
      goalProjectIds.size === 0
        ? allTasks
        : allTasks.filter((t) => !t.project_id || !goalProjectIds.has(t.project_id));

    const unlinkedNotes =
      goalProjectIds.size === 0
        ? allNotes
        : allNotes.filter((n) => {
            if (n.project_id && goalProjectIds.has(n.project_id)) return false;
            const junctionIds = noteProjectIdsByNoteId.get(n.id);
            if (junctionIds) {
              for (const pid of junctionIds) {
                if (goalProjectIds.has(pid)) return false;
              }
            }
            return true;
          });

    const unlinkedResources =
      goalProjectIds.size === 0
        ? allResources
        : allResources.filter(
            (r) =>
              r.linkedProjectIds.length === 0 ||
              !r.linkedProjectIds.some((pid) => goalProjectIds.has(pid)),
          );

    return {
      ...goal,
      progress: calculateGoalProgress(
        goal,
        goalProjectsWithLiveProgress,
        unlinkedTasks,
        unlinkedNotes,
        unlinkedResources,
      ),
    };
  });
}

async function hydrateGoalRollupCounts(goals: Goal[], sb: SupabaseClient): Promise<Goal[]> {
  if (goals.length === 0) return goals;
  const goalIds = goals.map((g) => g.id);

  const [
    { data: projectLinks, error: projectError },
    { data: taskLinks, error: taskError },
    { data: noteLinks, error: noteError },
    { data: resourceLinks, error: resourceError },
  ] = await Promise.all([
    sb
      .from("goal_projects")
      .select("goal_id, project:projects(status, is_archived)")
      .in("goal_id", goalIds),
    sb
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived)")
      .in("goal_id", goalIds),
    sb
      .from("goal_notes")
      .select("goal_id, note:notes(status, is_archived)")
      .in("goal_id", goalIds),
    sb
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
      noteCount: countFor(noteLinks, id, "note", (e) => !e.is_archived && e.status !== "archive" && e.status !== "completed"),
      resourceCount: countFor(resourceLinks, id, "resource", (e) => !e.is_archived && e.status !== "completed"),
    };
  });
}

async function hydrateSingleGoalProgress(goal: Goal, sb: SupabaseClient): Promise<Goal> {
  const [hydratedGoal] = await hydrateGoalProgress([goal], sb);
  return hydratedGoal;
}

async function hydrateSingleGoalAreaLinks(goal: Goal, sb: SupabaseClient): Promise<Goal> {
  const [hydratedGoal] = await hydrateGoalAreaLinks([goal], sb);
  return hydratedGoal;
}

async function hydrateSingleGoalRollupCounts(goal: Goal, sb: SupabaseClient): Promise<Goal> {
  const [hydratedGoal] = await hydrateGoalRollupCounts([goal], sb);
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
    options?: ServiceOptions,
  ): Promise<Goal[]> {
    const sb = options?.supabase ?? createClient();
    let query = sb
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
    } else if (filters.status === "inactive") {
      query = query.eq("is_completed", false).eq("is_archived", false);
    } else if (filters.status === "archived") {
      query = query.eq("is_archived", true);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(LIST_SAFETY_CAP);
    if (error) {
      throw new DatabaseError(error.message);
    }

    const rawGoals = data || [];
    const [goalsWithAreas, goalsWithProgress, goalsWithRollups] = await Promise.all([
      hydrateGoalAreaLinks(rawGoals, sb),
      hydrateGoalProgress(rawGoals, sb),
      hydrateGoalRollupCounts(rawGoals, sb),
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

  async getById(userId: string, id: string, options?: ServiceOptions): Promise<Goal> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
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

    const areaHydrated = await hydrateSingleGoalAreaLinks(data, sb);
    const [progressHydrated] = await hydrateGoalProgress([areaHydrated], sb);
    return hydrateSingleGoalRollupCounts(progressHydrated, sb);
  },

  async getBySlug(userId: string, slug: string, options?: ServiceOptions): Promise<Goal> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
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

    const areaHydrated = await hydrateSingleGoalAreaLinks(data, sb);
    const [progressHydrated] = await hydrateGoalProgress([areaHydrated], sb);
    return hydrateSingleGoalRollupCounts(progressHydrated, sb);
  },

  async getByIdentifier(userId: string, identifier: string, options?: ServiceOptions): Promise<Goal> {
    try {
      return await this.getBySlug(userId, identifier, options);
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }

    if (!isUuid(identifier)) {
      throw new NotFoundError("Goal", identifier);
    }

    return this.getById(userId, identifier, options);
  },

  async create(userId: string, input: CreateGoalInput, options?: ServiceOptions): Promise<Goal> {
    const sb = options?.supabase ?? createClient();
    const validated = createGoalSchema.parse(input);
    const { areaIds, goalInput } = extractGoalAreaIds(validated);

    const baseSlug = validated.slug ?? generateSlug(validated.name);
    const slug = await this.generateUniqueSlug(userId, baseSlug, options);

    const { data, error } = await sb
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
      await this.replaceAreaLinks(userId, data.id, areaIds, options);
    }

    return hydrateSingleGoalAreaLinks(data, sb);
  },

  async generateUniqueSlug(userId: string, baseSlug: string, options?: ServiceOptions): Promise<string> {
    const sb = options?.supabase ?? createClient();
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const exists = await sb
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

  async update(userId: string, id: string, input: UpdateGoalInput, options?: ServiceOptions): Promise<Goal> {
    const sb = options?.supabase ?? createClient();
    const validated = updateGoalSchema.parse(input);
    const { areaIds, goalInput } = extractGoalAreaIds(validated);
    let nextInput = goalInput;

    if (goalInput.is_completed === true && goalInput.progress === undefined) {
      nextInput = { ...goalInput, progress: 100 };
    } else if (goalInput.is_completed === false && goalInput.progress === undefined) {
      const currentGoal = await this.getById(userId, id, options);
      const reopenedGoal = await hydrateSingleGoalProgress({
        ...currentGoal,
        is_completed: false,
        progress: 0,
      }, sb);
      nextInput = {
        ...goalInput,
        progress: reopenedGoal.progress,
      };
    }

    const hasGoalUpdates = Object.keys(nextInput).length > 0;
    const { data, error } = hasGoalUpdates
      ? await sb
          .from("goals")
          .update(nextInput)
          .eq("user_id", userId)
          .eq("id", id)
          .select(GOAL_SELECT)
          .single()
      : { data: await this.getById(userId, id, options), error: null };

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Goal", id);
      }

      throw new DatabaseError(error.message);
    }

    if (areaIds !== undefined) {
      await this.replaceAreaLinks(userId, id, areaIds, options);
    }

    return hydrateSingleGoalRollupCounts(
      await hydrateSingleGoalAreaLinks(await hydrateSingleGoalProgress(data, sb), sb),
      sb,
    );
  },

  async countByArea(userId: string, areaId: string, options?: ServiceOptions): Promise<number> {
    const sb = options?.supabase ?? createClient();
    const [{ data: primaryGoals, error: primaryError }, { data: linkedGoals, error: linkedError }] =
      await Promise.all([
        sb
          .from("goals")
          .select("id")
          .eq("user_id", userId)
          .eq("area_id", areaId)
          .eq("is_archived", false),
        sb
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

  async getLinkedAreaIds(goalId: string, options?: ServiceOptions): Promise<string[]> {
    const sb = options?.supabase ?? createClient();
    try {
      const { data, error } = await sb
        .from("goal_areas")
        .select("area_id")
        .eq("goal_id", goalId);

      if (error) {
        if (isMissingGoalAreasTableError(error)) {
          const { data: goalData, error: goalError } = await sb
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
        const { data: goalData, error: goalError } = await sb
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

  async replaceAreaLinks(userId: string, goalId: string, areaIds: string[], options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const normalizedAreaIds = dedupeAreaIds(areaIds);

    const { error: updateError } = await sb
      .from("goals")
      .update({ area_id: normalizedAreaIds[0] ?? null })
      .eq("user_id", userId)
      .eq("id", goalId);

    if (updateError) {
      throw new DatabaseError(updateError.message);
    }

    try {
      const { error: deleteError } = await sb
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
      const { error: insertError } = await sb
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

  async linkToArea(userId: string, goalId: string, areaId: string, options?: ServiceOptions): Promise<Goal> {
    const goal = await this.getById(userId, goalId, options);
    const nextAreaIds = dedupeAreaIds([...getGoalLinkedAreaIds(goal), areaId]);
    await this.replaceAreaLinks(userId, goalId, nextAreaIds, options);
    return this.getById(userId, goalId, options);
  },

  async unlinkFromArea(userId: string, goalId: string, areaId: string, options?: ServiceOptions): Promise<Goal> {
    const goal = await this.getById(userId, goalId, options);
    const nextAreaIds = getGoalLinkedAreaIds(goal).filter((linkedAreaId) => linkedAreaId !== areaId);
    await this.replaceAreaLinks(userId, goalId, nextAreaIds, options);
    return this.getById(userId, goalId, options);
  },

  async delete(userId: string, id: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("goals")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async archive(userId: string, id: string, options?: ServiceOptions): Promise<Goal> {
    return this.update(userId, id, { is_archived: true }, options);
  },

  async restore(userId: string, id: string, options?: ServiceOptions): Promise<Goal> {
    return this.update(userId, id, { is_archived: false }, options);
  },
};
