import type { SupabaseClient } from "@supabase/supabase-js"

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at"

export interface GoalServerFilters {
  status?: "active" | "completed" | "all"
  term?: "all" | "short" | "mid" | "long"
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
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  if (filters.status === "completed") {
    query = query.eq("is_completed", true)
  } else if (filters.status === "active") {
    query = query.eq("is_completed", false)
  }

  if (filters.term && filters.term !== "all") {
    query = query.eq("term", filters.term)
  }

  const { data } = await query
  return data ?? []
}
