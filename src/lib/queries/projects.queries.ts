import type { SupabaseClient } from "@supabase/supabase-js";

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at";

export interface ProjectServerFilters {
  status?: "active" | "completed" | "paused" | "cancelled" | "all";
}

type ProjectLike = {
  area_id: string | null;
  id: string;
  status?: string;
  progress?: number | null;
};

type ProjectWithLinkedGoalIds = {
  id: string;
  linkedGoalIds?: string[] | null;
};

const NOTE_ACTIVE = new Set(["inbox", "to_review", "active"]);
const RESOURCE_ACTIVE = new Set(["inbox", "to_review", "active"]);

export interface ProjectRollupCounts {
  goalCount: number;
  taskCount: number;
  noteCount: number;
  resourceCount: number;
}

// Server twin of hydrateProjectRollupCounts in src/lib/services/project.service.ts.
// Computes the same correlation counts ProjectCard renders so SSR-prefetched
// project payloads carry these fields, preventing the "zero on first paint
// then update after refetch" pop-in (and the inverse: SSR re-hydration on
// nav-back overwriting client-corrected counts back to zero).
export async function hydrateProjectRollupCounts<T extends ProjectWithLinkedGoalIds>(
  supabase: SupabaseClient,
  projects: T[],
): Promise<Array<T & ProjectRollupCounts>> {
  if (projects.length === 0) {
    return projects.map((p) => ({
      ...p,
      goalCount: 0,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 0,
    }));
  }

  const projectIds = projects.map((p) => p.id);

  const linkedGoalIdsByProject = new Map<string, string[]>();
  for (const project of projects) {
    linkedGoalIdsByProject.set(project.id, project.linkedGoalIds ?? []);
  }
  const allGoalIds = Array.from(
    new Set(Array.from(linkedGoalIdsByProject.values()).flat()),
  );

  const [
    activeGoalsResult,
    { data: taskRows },
    taskJunctionResult,
    { data: noteRows },
    { data: noteJunctionRows },
    { data: resourceRows },
  ] = await Promise.all([
    allGoalIds.length > 0
      ? supabase
          .from("goals")
          .select("id, is_completed, is_archived")
          .in("id", allGoalIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; is_completed: boolean; is_archived: boolean }>,
        }),
    supabase
      .from("tasks")
      .select("id, project_id, is_completed, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("task_projects")
      .select("project_id, task:tasks(id, is_completed, is_archived)")
      .in("project_id", projectIds),
    supabase
      .from("notes")
      .select("id, project_id, status, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("note_projects")
      .select("project_id, note:notes(id, status, is_archived)")
      .in("project_id", projectIds),
    supabase
      .from("resource_projects")
      .select("project_id, resource:resources(status, is_archived)")
      .in("project_id", projectIds),
  ]);

  const activeGoalIdSet = new Set(
    (
      (activeGoalsResult as {
        data?: Array<{ id: string; is_completed: boolean; is_archived: boolean }>;
      }).data ?? []
    )
      .filter((g) => !g.is_completed && !g.is_archived)
      .map((g) => g.id),
  );

  const taskCountByProject = new Map<string, number>();
  const seenTasksByProject = new Map<string, Set<string>>();
  const recordTask = (
    projectId: string,
    taskId: string,
    isCompleted: boolean,
    isArchived: boolean,
  ) => {
    if (isArchived || isCompleted) return;
    const seen = seenTasksByProject.get(projectId) ?? new Set<string>();
    if (seen.has(taskId)) return;
    seen.add(taskId);
    seenTasksByProject.set(projectId, seen);
    taskCountByProject.set(projectId, (taskCountByProject.get(projectId) ?? 0) + 1);
  };
  for (const t of (taskRows ?? []) as Array<{
    id: string;
    project_id: string | null;
    is_completed: boolean;
    is_archived: boolean;
  }>) {
    if (!t.project_id) continue;
    recordTask(t.project_id, t.id, t.is_completed, t.is_archived);
  }
  const taskJunctionRows =
    (
      taskJunctionResult as {
        data?: Array<{
          project_id: string;
          task:
            | { id: string; is_completed: boolean; is_archived: boolean }
            | { id: string; is_completed: boolean; is_archived: boolean }[]
            | null;
        }>;
      }
    ).data ?? [];
  for (const link of taskJunctionRows) {
    const task = Array.isArray(link.task) ? link.task[0] : link.task;
    if (!task) continue;
    recordTask(link.project_id, task.id, task.is_completed, task.is_archived);
  }

  const noteCountByProject = new Map<string, number>();
  const seenNotesByProject = new Map<string, Set<string>>();
  for (const n of (noteRows ?? []) as Array<{
    id: string;
    project_id: string | null;
    status: string;
    is_archived: boolean;
  }>) {
    if (!n.project_id || n.is_archived || !NOTE_ACTIVE.has(n.status)) continue;
    const seen = seenNotesByProject.get(n.project_id) ?? new Set<string>();
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    seenNotesByProject.set(n.project_id, seen);
    noteCountByProject.set(n.project_id, (noteCountByProject.get(n.project_id) ?? 0) + 1);
  }
  for (const link of (noteJunctionRows ?? []) as Array<{
    project_id: string;
    note:
      | { id: string; status: string; is_archived: boolean }
      | { id: string; status: string; is_archived: boolean }[]
      | null;
  }>) {
    const note = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!note || note.is_archived || !NOTE_ACTIVE.has(note.status)) continue;
    const seen = seenNotesByProject.get(link.project_id) ?? new Set<string>();
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    seenNotesByProject.set(link.project_id, seen);
    noteCountByProject.set(
      link.project_id,
      (noteCountByProject.get(link.project_id) ?? 0) + 1,
    );
  }

  const resourceCountByProject = new Map<string, number>();
  for (const link of (resourceRows ?? []) as Array<{
    project_id: string;
    resource:
      | { status: string; is_archived: boolean }
      | { status: string; is_archived: boolean }[]
      | null;
  }>) {
    const resource = Array.isArray(link.resource) ? link.resource[0] : link.resource;
    if (!resource || resource.is_archived || !RESOURCE_ACTIVE.has(resource.status)) continue;
    resourceCountByProject.set(
      link.project_id,
      (resourceCountByProject.get(link.project_id) ?? 0) + 1,
    );
  }

  return projects.map((project) => {
    const goalCount = (linkedGoalIdsByProject.get(project.id) ?? []).filter((id) =>
      activeGoalIdSet.has(id),
    ).length;
    return {
      ...project,
      goalCount,
      taskCount: taskCountByProject.get(project.id) ?? 0,
      noteCount: noteCountByProject.get(project.id) ?? 0,
      resourceCount: resourceCountByProject.get(project.id) ?? 0,
    };
  });
}

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
}

// Server twin of hydrateProjectProgress in src/lib/services/project.service.ts.
// Recomputes each project's progress from live tasks/notes/resources so the
// SSR-prefetched payload carries the same percentage the client renders after
// a refetch — avoiding stale progress on first paint when the stored
// projects.progress column hasn't been recomputed by a trigger.
export async function hydrateProjectProgress<T extends ProjectLike>(
  supabase: SupabaseClient,
  projects: T[],
): Promise<T[]> {
  if (projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);

  const [
    { data: taskRows },
    { data: noteRows },
    { data: noteJunctionRows },
    { data: resourceRows },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("project_id, is_completed, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("notes")
      .select("id, project_id, status, is_archived")
      .in("project_id", projectIds),
    supabase
      .from("note_projects")
      .select("project_id, note:notes(id, status, is_archived)")
      .in("project_id", projectIds),
    supabase
      .from("resource_projects")
      .select("project_id, resource:resources(status, is_archived)")
      .in("project_id", projectIds),
  ]);

  const completedByProject = new Map<string, number>();
  const totalByProject = new Map<string, number>();
  const seenNotesByProject = new Map<string, Set<string>>();

  const bump = (projectId: string, done: boolean) => {
    completedByProject.set(projectId, (completedByProject.get(projectId) ?? 0) + (done ? 1 : 0));
    totalByProject.set(projectId, (totalByProject.get(projectId) ?? 0) + 1);
  };

  for (const t of (taskRows ?? []) as Array<{
    project_id: string | null;
    is_completed: boolean;
    is_archived: boolean;
  }>) {
    if (!t.project_id || t.is_archived) continue;
    bump(t.project_id, t.is_completed);
  }

  for (const n of (noteRows ?? []) as Array<{
    id: string;
    project_id: string | null;
    status: string;
    is_archived: boolean;
  }>) {
    if (!n.project_id || n.is_archived || n.status === "archive") continue;
    const seen = seenNotesByProject.get(n.project_id) ?? new Set<string>();
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    seenNotesByProject.set(n.project_id, seen);
    bump(n.project_id, n.status === "completed");
  }

  for (const link of (noteJunctionRows ?? []) as Array<{
    project_id: string;
    note:
      | { id: string; status: string; is_archived: boolean }
      | { id: string; status: string; is_archived: boolean }[]
      | null;
  }>) {
    const note = Array.isArray(link.note) ? link.note[0] : link.note;
    if (!note || note.is_archived || note.status === "archive") continue;
    const seen = seenNotesByProject.get(link.project_id) ?? new Set<string>();
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    seenNotesByProject.set(link.project_id, seen);
    bump(link.project_id, note.status === "completed");
  }

  for (const link of (resourceRows ?? []) as Array<{
    project_id: string;
    resource:
      | { status: string; is_archived: boolean }
      | { status: string; is_archived: boolean }[]
      | null;
  }>) {
    const resource = Array.isArray(link.resource) ? link.resource[0] : link.resource;
    if (!resource || resource.is_archived) continue;
    bump(link.project_id, resource.status === "completed");
  }

  return projects.map((project) => {
    if (project.status === "completed") {
      return { ...project, progress: 100 };
    }
    const total = totalByProject.get(project.id) ?? 0;
    if (total === 0) {
      return { ...project, progress: project.progress ?? 0 };
    }
    const completed = completedByProject.get(project.id) ?? 0;
    return { ...project, progress: Math.round((completed / total) * 100) };
  });
}

async function hydrateAreaLinks(
  supabase: SupabaseClient,
  projects: ProjectLike[],
): Promise<Array<ProjectLike & { linkedAreaIds: string[] }>> {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const { data } = await supabase
    .from("project_areas")
    .select("project_id, area_id")
    .in("project_id", projectIds);

  const areaIdsByProjectId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = areaIdsByProjectId.get(row.project_id) ?? [];
    current.push(row.area_id);
    areaIdsByProjectId.set(row.project_id, current);
  }

  return projects.map((project) => ({
    ...project,
    linkedAreaIds: dedupe([project.area_id, ...(areaIdsByProjectId.get(project.id) ?? [])]),
  }));
}

async function hydrateGoalLinks(
  supabase: SupabaseClient,
  projects: ProjectLike[],
): Promise<Array<ProjectLike & { linkedGoalIds: string[] }>> {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const { data } = await supabase
    .from("goal_projects")
    .select("project_id, goal_id")
    .in("project_id", projectIds);

  const goalIdsByProjectId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = goalIdsByProjectId.get(row.project_id) ?? [];
    current.push(row.goal_id);
    goalIdsByProjectId.set(row.project_id, current);
  }

  return projects.map((project) => ({
    ...project,
    linkedGoalIds: goalIdsByProjectId.get(project.id) ?? [],
  }));
}

export async function serverFetchProjects(
  supabase: SupabaseClient,
  userId: string,
  filters: ProjectServerFilters = {},
) {
  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data } = await query;
  const projects = (data ?? []) as ProjectLike[];

  const [withAreas, withGoals] = await Promise.all([
    hydrateAreaLinks(supabase, projects),
    hydrateGoalLinks(supabase, projects),
  ]);

  const hydrated = projects.map((project, index) => ({
    ...project,
    linkedAreaIds: withAreas[index]?.linkedAreaIds ?? dedupe([project.area_id]),
    linkedGoalIds: withGoals[index]?.linkedGoalIds ?? [],
  }));

  const withProgress = await hydrateProjectProgress(supabase, hydrated);
  return hydrateProjectRollupCounts(supabase, withProgress);
}
