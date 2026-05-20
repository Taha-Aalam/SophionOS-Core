import type { SupabaseClient } from "@supabase/supabase-js"

const CONTACT_SELECT =
  "id, user_id, name, slug, role, organization, group, phone, email, linkedin, website, last_interaction_at, follow_up_interval_days, favorite, notes, archive, image_url, metadata, created_at, updated_at"

export async function serverFetchContacts(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("user_id", userId)
    .eq("archive", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
