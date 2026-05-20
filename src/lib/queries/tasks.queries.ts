import type { SupabaseClient } from "@supabase/supabase-js"

const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at"

export async function serverFetchTasks(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
