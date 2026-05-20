import type { SupabaseClient } from "@supabase/supabase-js"

const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at"

export async function serverFetchResources(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
