import type { SupabaseClient } from "@supabase/supabase-js"

const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, notebook, favorite, pin, is_archived, metadata, created_at, updated_at"

export async function serverFetchNotes(
  supabase: SupabaseClient,
  userId: string,
  filters: { includeArchived?: boolean } = {},
) {
  let query = supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!filters.includeArchived) {
    query = query.eq("is_archived", false)
  }

  const { data } = await query
  return data ?? []
}
