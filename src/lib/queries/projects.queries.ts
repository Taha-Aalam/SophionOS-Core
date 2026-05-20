import type { SupabaseClient } from "@supabase/supabase-js"

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at"

export interface ProjectServerFilters {
  status?: "active" | "completed" | "paused" | "cancelled" | "all"
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
  return data ?? []
}
