import type { SupabaseClient } from "@supabase/supabase-js"

const CONTACT_SELECT =
  "id, user_id, name, slug, role, organization, group, phone, email, linkedin, website, last_interaction_at, follow_up_interval_days, favorite, notes, archive, image_url, metadata, created_at, updated_at"

export async function serverFetchContactBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
) {
  const { data } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle()
  return data ?? null
}

export async function serverFetchContactProjectLinks(supabase: SupabaseClient, contactId: string) {
  const { data } = await supabase
    .from("contact_projects")
    .select("contact_id, project_id, role_in_project")
    .eq("contact_id", contactId)
  return data ?? []
}

export async function serverFetchContactTaskLinks(supabase: SupabaseClient, contactId: string) {
  const { data } = await supabase
    .from("contact_tasks")
    .select("contact_id, task_id, role_in_task")
    .eq("contact_id", contactId)
  return data ?? []
}

export async function serverFetchContactAreaLinks(supabase: SupabaseClient, contactId: string) {
  const { data } = await supabase
    .from("contact_areas")
    .select("contact_id, area_id")
    .eq("contact_id", contactId)
  return data ?? []
}

export async function serverFetchContactGoalLinks(supabase: SupabaseClient, contactId: string) {
  const { data } = await supabase
    .from("contact_goals")
    .select("contact_id, goal_id")
    .eq("contact_id", contactId)
  return data ?? []
}

export async function serverFetchContactLogs(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
) {
  const { data } = await supabase
    .from("contact_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .order("logged_at", { ascending: false })
  return data ?? []
}
