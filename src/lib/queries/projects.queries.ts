import type { SupabaseClient } from "@supabase/supabase-js"

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at"

export interface ProjectServerFilters {
  status?: "active" | "completed" | "paused" | "cancelled" | "all"
}

async function hydrateGoalLinks(
  supabase: SupabaseClient,
  projects: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (projects.length === 0) return projects
  const ids = projects.map((p) => p.id as string)
  const { data } = await supabase
    .from("goal_projects")
    .select("project_id, goal_id")
    .in("project_id", ids)
  if (!data || data.length === 0) {
    return projects.map((p) => ({ ...p, linkedGoalIds: [] }))
  }
  const goalsByProject = new Map<string, string[]>()
  for (const row of data) {
    const list = goalsByProject.get(row.project_id) ?? []
    list.push(row.goal_id)
    goalsByProject.set(row.project_id, list)
  }
  return projects.map((p) => ({
    ...p,
    linkedGoalIds: goalsByProject.get(p.id as string) ?? [],
  }))
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
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  const { data } = await query
  const projects = data ?? []
  return hydrateGoalLinks(supabase, projects as Record<string, unknown>[])
}
