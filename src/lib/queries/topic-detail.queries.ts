import type { SupabaseClient } from "@supabase/supabase-js"

import { hydrateResourceLinks } from "@/lib/queries/project-detail.queries"
import { hydrateNotebooks } from "@/lib/queries/notes.queries"

const TOPIC_SELECT =
  "id, user_id, area_id, name, slug, favorite, inactive, is_archived, metadata, created_at, updated_at"
const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, favorite, pin, is_archived, metadata, created_at, updated_at"
const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateTopic(supabase: SupabaseClient, topic: any): Promise<any> {
  const { data: areaLinks } = await supabase
    .from("topic_areas")
    .select("area_id")
    .eq("topic_id", topic.id)
  return {
    ...topic,
    linkedAreaIds: (areaLinks ?? []).map((r: { area_id: string }) => r.area_id),
    notesCount: 0,
    resourcesCount: 0,
  }
}

export async function serverFetchTopicByIdentifier(
  supabase: SupabaseClient,
  userId: string,
  identifier: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let topic: any = null

  if (!isUuid(identifier)) {
    const { data } = await supabase
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("slug", identifier)
      .maybeSingle()
    topic = data
  }

  if (!topic) {
    const { data } = await supabase
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("id", identifier)
      .maybeSingle()
    topic = data
  }

  if (!topic) return null
  return hydrateTopic(supabase, topic)
}

export async function serverFetchNotesForTopic(
  supabase: SupabaseClient,
  userId: string,
  topicId: string,
) {
  const { data } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("updated_at", { ascending: false })
  return hydrateNotebooks(supabase, data ?? [])
}

export async function serverFetchResourcesForTopic(
  supabase: SupabaseClient,
  userId: string,
  topicId: string,
) {
  const { data } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("updated_at", { ascending: false })
  return hydrateResourceLinks(supabase, data ?? [])
}
