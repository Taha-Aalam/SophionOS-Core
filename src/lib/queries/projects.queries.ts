import type { SupabaseClient } from "@supabase/supabase-js";

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at";

export interface ProjectServerFilters {
  status?: "active" | "completed" | "paused" | "cancelled" | "all";
}

type ProjectLike = {
  area_id: string | null;
  id: string;
};

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
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

  return projects.map((project, index) => ({
    ...project,
    linkedAreaIds: withAreas[index]?.linkedAreaIds ?? dedupe([project.area_id]),
    linkedGoalIds: withGoals[index]?.linkedGoalIds ?? [],
  }));
}
