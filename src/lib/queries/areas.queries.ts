import type { SupabaseClient } from "@supabase/supabase-js"

const AREA_SELECT =
  "id, user_id, name, description, icon, color, type, metadata, inactive, archive, slug, created_at, updated_at"

export async function serverFetchAreas(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("areas")
    .select(AREA_SELECT)
    .eq("user_id", userId)
    .eq("archive", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
