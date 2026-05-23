import type { SupabaseClient } from "@supabase/supabase-js"

const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, notebook, favorite, pin, is_archived, metadata, created_at, updated_at"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((x): x is string => Boolean(x))))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateNoteLinks(supabase: SupabaseClient, note: any): Promise<any> {
  const [areasResult, goalsResult, projectsResult, tasksResult] = await Promise.all([
    supabase.from("note_areas").select("area_id").eq("note_id", note.id),
    supabase.from("goal_notes").select("goal_id").eq("note_id", note.id),
    supabase.from("note_projects").select("project_id").eq("note_id", note.id),
    supabase.from("task_notes").select("task_id").eq("note_id", note.id),
  ])
  return {
    ...note,
    linkedAreaIds: dedupe([note.area_id, ...(areasResult.data ?? []).map((r: { area_id: string }) => r.area_id)]),
    linkedGoalIds: (goalsResult.data ?? []).map((r: { goal_id: string }) => r.goal_id),
    linkedProjectIds: dedupe([note.project_id, ...(projectsResult.data ?? []).map((r: { project_id: string }) => r.project_id)]),
    linkedTaskIds: (tasksResult.data ?? []).map((r: { task_id: string }) => r.task_id),
  }
}

export async function serverFetchNoteByIdentifier(
  supabase: SupabaseClient,
  userId: string,
  identifier: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let note: any = null
  if (isUuid(identifier)) {
    const { data } = await supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .eq("id", identifier)
      .maybeSingle()
    note = data
  } else {
    const { data } = await supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("user_id", userId)
      .eq("slug", identifier)
      .maybeSingle()
    note = data
  }
  if (!note) return null
  return hydrateNoteLinks(supabase, note)
}

export async function serverFetchNoteTypes(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("note_types")
    .select("id, name, slug")
    .eq("user_id", userId)
    .order("name", { ascending: true })
  return data ?? []
}

export async function serverFetchRelatedNotes(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
) {
  const { data: links } = await supabase
    .from("note_related_notes")
    .select("note_a_id, note_b_id")
    .or(`note_a_id.eq.${noteId},note_b_id.eq.${noteId}`)

  if (!links || links.length === 0) return []

  const relatedIds = new Set<string>()
  for (const row of links) {
    if (row.note_a_id !== noteId) relatedIds.add(row.note_a_id)
    if (row.note_b_id !== noteId) relatedIds.add(row.note_b_id)
  }
  if (relatedIds.size === 0) return []

  const { data: notes } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .in("id", Array.from(relatedIds))
  return notes ?? []
}
