import type { SupabaseClient } from "@supabase/supabase-js"

const TOPIC_SELECT =
  "id, user_id, area_id, name, slug, favorite, inactive, is_archived, metadata, created_at, updated_at"

export async function serverFetchTopics(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("name")

  return data ?? []
}
