import type { SupabaseClient } from "@supabase/supabase-js";

import type { Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { calculateGoalProgress } from "@/lib/utils/goals";

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at";

export interface GoalServerFilters {
  status?: "active" | "completed" | "all";
  term?: "all" | "short" | "mid" | "long";
}

type GoalLike = {
  area_id: string | null;
  id: string;
  is_archived: boolean;
  is_completed: boolean;
  progress: number;
};

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
}

async function hydrateGoalAreaLinks(
  supabase: SupabaseClient,
  goals: GoalLike[],
): Promise<Array<GoalLike & { linkedAreaIds: string[] }>> {
  if (goals.length === 0) {
    return [];
  }

  const goalIds = goals.map((goal) => goal.id);
  const { data } = await supabase
    .from("goal_areas")
    .select("goal_id, area_id")
    .in("goal_id", goalIds);

  const areaIdsByGoalId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = areaIdsByGoalId.get(row.goal_id) ?? [];
    current.push(row.area_id);
    areaIdsByGoalId.set(row.goal_id, current);
  }

  return goals.map((goal) => ({
    ...goal,
    linkedAreaIds: dedupe([goal.area_id, ...(areaIdsByGoalId.get(goal.id) ?? [])]),
  }));
}

async function hydrateGoalProgress(
  supabase: SupabaseClient,
  goals: GoalLike[],
): Promise<GoalLike[]> {
  if (goals.length === 0) {
    return goals;
  }

  const goalIds = goals.map((goal) => goal.id);
  const [projectLinks, taskLinks, noteLinks, resourceLinks] = await Promise.all([
    supabase
      .from("goal_projects")
      .select("goal_id, project:projects(id, status, is_archived, progress)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
    supabase
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived, project_id)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
    supabase
      .from("goal_notes")
      .select("goal_id, note:notes(id, status, is_archived, project_id)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
    supabase
      .from("goal_resources")
      .select("goal_id, resource_id, resource:resources(id, status, is_archived)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
  ]);

  type ProjectEntry = Pick<Project, "is_archived" | "progress" | "status"> & { id: string };
  type TaskEntry = Pick<Task, "is_archived" | "is_completed" | "project_id">;
  type NoteEntry = Pick<Note, "is_archived" | "project_id" | "status"> & { id: string };
  type ResourceEntry = Pick<Resource, "is_archived" | "status"> & { id: string; linkedProjectIds: string[] };
  type ResourceLinkRow = { goal_id: string; resource_id: string; resource: { id: string; is_archived: boolean; status: string } | { id: string; is_archived: boolean; status: string }[] | null };

  const projectsByGoalId = new Map<string, ProjectEntry[]>();
  for (const link of projectLinks as Array<{ goal_id: string; project: ProjectEntry | ProjectEntry[] | null }>) {
    const project = Array.isArray(link.project) ? link.project[0] : link.project;
    if (!project) continue;
    const current = projectsByGoalId.get(link.goal_id) ?? [];
    current.push(project);
    projectsByGoalId.set(link.goal_id, current);
  }

  const tasksByGoalId = new Map<string, TaskEntry[]>();
  for (const link of taskLinks as Array<{ goal_id: string; task: TaskEntry | TaskEntry[] | null }>) {
    const task = Array.isArray(link.task) ? link.task[0] : link.task;
    if (!task) continue;
    const current = tasksByGoalId.get(link.goal_id) ?? [];
    current.push(task);
    tasksByGoalId.set(link.goal_id, current);
  }

  const notesByGoalId = new Map<string, NoteEntry[]>();
  for (const link of noteLinks as Array<{ goal_id: string; note: NoteEntry | NoteEntry[] | null }>) {
    const note = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!note) continue;
    const current = notesByGoalId.get(link.goal_id) ?? [];
    current.push(note);
    notesByGoalId.set(link.goal_id, current);
  }

  const resourcesByGoalId = new Map<string, ResourceEntry[]>();
  for (const link of (resourceLinks ?? []) as ResourceLinkRow[]) {
    const resource = Array.isArray(link.resource) ? link.resource[0] : link.resource;
    if (!resource) continue;
    const entry: ResourceEntry = { ...resource, linkedProjectIds: [] } as ResourceEntry;
    const current = resourcesByGoalId.get(link.goal_id) ?? [];
    current.push(entry);
    resourcesByGoalId.set(link.goal_id, current);
  }

  const allGoalResourceIds = Array.from(
    new Set(Array.from(resourcesByGoalId.values()).flat().map((r) => r.id)),
  );
  const resourceProjectIdsByResourceId = new Map<string, Set<string>>();
  if (allGoalResourceIds.length > 0) {
    const { data: resourceProjectData } = await supabase
      .from("resource_projects")
      .select("resource_id, project_id")
      .in("resource_id", allGoalResourceIds);

    for (const row of resourceProjectData ?? []) {
      const current = resourceProjectIdsByResourceId.get(row.resource_id) ?? new Set<string>();
      current.add(row.project_id);
      resourceProjectIdsByResourceId.set(row.resource_id, current);
    }

    for (const resources of resourcesByGoalId.values()) {
      for (const resource of resources) {
        resource.linkedProjectIds = Array.from(
          resourceProjectIdsByResourceId.get(resource.id) ?? [],
        );
      }
    }
  }

  const allNoteIds = Array.from(new Set(Array.from(notesByGoalId.values()).flat().map((note) => note.id)));
  const noteProjectIdsByNoteId = new Map<string, Set<string>>();
  if (allNoteIds.length > 0) {
    const { data: noteProjectData } = await supabase
      .from("note_projects")
      .select("note_id, project_id")
      .in("note_id", allNoteIds);

    for (const row of noteProjectData ?? []) {
      const current = noteProjectIdsByNoteId.get(row.note_id) ?? new Set<string>();
      current.add(row.project_id);
      noteProjectIdsByNoteId.set(row.note_id, current);
    }
  }

  const allGoalProjectIds = Array.from(
    new Set(Array.from(projectsByGoalId.values()).flat().map((project) => project.id)),
  );

  const projectTasksByProjectId = new Map<string, Array<{ is_archived: boolean; is_completed: boolean }>>();
  const projectNotesByProjectId = new Map<string, Array<{ id: string; is_archived: boolean; status: string }>>();
  const projectResourcesByProjectId = new Map<string, Array<{ is_archived: boolean; status: string }>>();

  if (allGoalProjectIds.length > 0) {
    const [allProjectTasks, allProjectNotes, allProjectNoteLinks, allProjectResources] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("project_id, is_completed, is_archived")
          .in("project_id", allGoalProjectIds)
          .then((result) => result.data ?? []),
        supabase
          .from("notes")
          .select("id, project_id, status, is_archived")
          .in("project_id", allGoalProjectIds)
          .then((result) => result.data ?? []),
        supabase
          .from("note_projects")
          .select("project_id, note:notes(id, status, is_archived)")
          .in("project_id", allGoalProjectIds)
          .then((result) => result.data ?? []),
        supabase
          .from("resource_projects")
          .select("project_id, resource:resources(status, is_archived)")
          .in("project_id", allGoalProjectIds)
          .then((result) => result.data ?? []),
      ]);

    for (const task of allProjectTasks as Array<{ project_id: string | null; is_archived: boolean; is_completed: boolean }>) {
      if (!task.project_id) continue;
      const current = projectTasksByProjectId.get(task.project_id) ?? [];
      current.push({ is_archived: task.is_archived, is_completed: task.is_completed });
      projectTasksByProjectId.set(task.project_id, current);
    }

    const seenNotesByProjectId = new Map<string, Set<string>>();

    for (const note of allProjectNotes as Array<{ id: string; project_id: string | null; is_archived: boolean; status: string }>) {
      if (!note.project_id) continue;
      const seen = seenNotesByProjectId.get(note.project_id) ?? new Set<string>();
      if (seen.has(note.id)) continue;
      const current = projectNotesByProjectId.get(note.project_id) ?? [];
      current.push({ id: note.id, is_archived: note.is_archived, status: note.status });
      projectNotesByProjectId.set(note.project_id, current);
      seen.add(note.id);
      seenNotesByProjectId.set(note.project_id, seen);
    }

    for (const link of allProjectNoteLinks as Array<{ project_id: string; note: { id: string; is_archived: boolean; status: string } | { id: string; is_archived: boolean; status: string }[] | null }>) {
      const note = Array.isArray(link.note) ? link.note[0] : link.note;
      if (!note) continue;
      const seen = seenNotesByProjectId.get(link.project_id) ?? new Set<string>();
      if (seen.has(note.id)) continue;
      const current = projectNotesByProjectId.get(link.project_id) ?? [];
      current.push({ id: note.id, is_archived: note.is_archived, status: note.status });
      projectNotesByProjectId.set(link.project_id, current);
      seen.add(note.id);
      seenNotesByProjectId.set(link.project_id, seen);
    }

    for (const link of allProjectResources as Array<{ project_id: string; resource: { status: string; is_archived: boolean } | { status: string; is_archived: boolean }[] | null }>) {
      const resource = Array.isArray(link.resource) ? link.resource[0] : link.resource;
      if (!resource) continue;
      const current = projectResourcesByProjectId.get(link.project_id) ?? [];
      current.push({ is_archived: resource.is_archived, status: resource.status });
      projectResourcesByProjectId.set(link.project_id, current);
    }
  }

  return goals.map((goal) => {
    const goalProjects = projectsByGoalId.get(goal.id) ?? [];
    const goalProjectIds = new Set(goalProjects.map((project) => project.id));
    const goalTasks = tasksByGoalId.get(goal.id) ?? [];
    const goalNotes = notesByGoalId.get(goal.id) ?? [];
    const goalResources = resourcesByGoalId.get(goal.id) ?? [];

    const goalProjectsWithLiveProgress = goalProjects.map((project) => {
      const projectTasks = (projectTasksByProjectId.get(project.id) ?? []).filter((task) => !task.is_archived);
      const projectNotes = (projectNotesByProjectId.get(project.id) ?? []).filter(
        (note) => !note.is_archived && note.status !== "archive",
      );
      const projectResources = (projectResourcesByProjectId.get(project.id) ?? []).filter(
        (resource) => !resource.is_archived,
      );
      const total = projectTasks.length + projectNotes.length + projectResources.length;
      if (total === 0) {
        return project;
      }

      const completed =
        projectTasks.filter((task) => task.is_completed).length +
        projectNotes.filter((note) => note.status === "completed").length +
        projectResources.filter((resource) => resource.status === "completed").length;

      return {
        ...project,
        progress: Math.round((completed / total) * 100),
      };
    });

    const unlinkedTasks =
      goalProjectIds.size === 0
        ? goalTasks
        : goalTasks.filter((task) => !task.project_id || !goalProjectIds.has(task.project_id));

    const unlinkedNotes =
      goalProjectIds.size === 0
        ? goalNotes
        : goalNotes.filter((note) => {
            if (note.project_id && goalProjectIds.has(note.project_id)) {
              return false;
            }

            const junctionProjectIds = noteProjectIdsByNoteId.get(note.id);
            if (junctionProjectIds) {
              for (const projectId of junctionProjectIds) {
                if (goalProjectIds.has(projectId)) {
                  return false;
                }
              }
            }

            return true;
          });

    const unlinkedResources =
      goalProjectIds.size === 0
        ? goalResources
        : goalResources.filter((resource) => {
            const projectIds = resource.linkedProjectIds ?? [];
            return !projectIds.some((pId) => goalProjectIds.has(pId));
          });

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

async function hydrateGoalRollupCounts(
  supabase: SupabaseClient,
  goals: GoalLike[],
): Promise<Array<GoalLike & { noteCount: number; projectCount: number; resourceCount: number; taskCount: number }>> {
  if (goals.length === 0) {
    return [];
  }

  const goalIds = goals.map((goal) => goal.id);
  const [projectLinks, taskLinks, noteLinks, resourceLinks] = await Promise.all([
    supabase
      .from("goal_projects")
      .select("goal_id, project:projects(status, is_archived)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
    supabase
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
    supabase
      .from("goal_notes")
      .select("goal_id, note:notes(status, is_archived)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
    supabase
      .from("goal_resources")
      .select("goal_id, resource:resources(status, is_archived)")
      .in("goal_id", goalIds)
      .then((result) => result.data ?? []),
  ]);

  const countFor = (
    links: Array<{ goal_id: string } & Record<string, unknown>>,
    goalId: string,
    entityKey: string,
    predicate: (entity: Record<string, unknown>) => boolean,
  ) =>
    links
      .filter((link) => link.goal_id === goalId)
      .map((link) => {
        const entity = Array.isArray(link[entityKey])
          ? (link[entityKey] as Record<string, unknown>[])[0]
          : (link[entityKey] as Record<string, unknown> | undefined);
        return entity;
      })
      .filter((entity): entity is Record<string, unknown> => Boolean(entity))
      .filter(predicate).length;

  return goals.map((goal) => ({
    ...goal,
    projectCount: countFor(
      projectLinks as Array<{ goal_id: string } & Record<string, unknown>>,
      goal.id,
      "project",
      (entity) => !entity.is_archived && entity.status !== "completed",
    ),
    taskCount: countFor(
      taskLinks as Array<{ goal_id: string } & Record<string, unknown>>,
      goal.id,
      "task",
      (entity) => !entity.is_archived && !entity.is_completed,
    ),
    noteCount: countFor(
      noteLinks as Array<{ goal_id: string } & Record<string, unknown>>,
      goal.id,
      "note",
      (entity) => !entity.is_archived && entity.status !== "archive" && entity.status !== "completed",
    ),
    resourceCount: countFor(
      resourceLinks as Array<{ goal_id: string } & Record<string, unknown>>,
      goal.id,
      "resource",
      (entity) => !entity.is_archived && entity.status !== "completed",
    ),
  }));
}

export async function serverFetchGoals(
  supabase: SupabaseClient,
  userId: string,
  filters: GoalServerFilters = {},
) {
  let query = supabase
    .from("goals")
    .select(GOAL_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filters.status === "completed") {
    query = query.eq("is_completed", true).eq("is_archived", false);
  } else if (filters.status === "active") {
    query = query.eq("is_completed", false).eq("is_archived", false);
  }

  if (filters.term && filters.term !== "all") {
    query = query.eq("term", filters.term);
  }

  const { data, error } = await query;

  // Surface the error rather than swallowing it into an empty array — a
  // transient failure would otherwise dehydrate an empty success state that
  // the client trusts permanently (refetchOnMount is off). Throwing leaves the
  // prefetched query errored (not dehydrated), so the client refetches on
  // mount and recovers. See serverFetchResources for the full rationale.
  if (error) {
    throw error;
  }

  const rawGoals = (data ?? []) as GoalLike[];

  const [goalsWithAreas, goalsWithProgress, goalsWithRollups] = await Promise.all([
    hydrateGoalAreaLinks(supabase, rawGoals),
    hydrateGoalProgress(supabase, rawGoals),
    hydrateGoalRollupCounts(supabase, rawGoals),
  ]);

  return goalsWithAreas.map((goal, index) => ({
    ...goal,
    progress: goalsWithProgress[index]?.progress ?? goal.progress,
    projectCount: goalsWithRollups[index]?.projectCount ?? 0,
    taskCount: goalsWithRollups[index]?.taskCount ?? 0,
    noteCount: goalsWithRollups[index]?.noteCount ?? 0,
    resourceCount: goalsWithRollups[index]?.resourceCount ?? 0,
  }));
}
