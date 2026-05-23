import type { SupabaseClient } from "@supabase/supabase-js"

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at"
const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((x): x is string => Boolean(x))))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateProject(supabase: SupabaseClient, project: any): Promise<any> {
  const projectId: string = project.id
  const [
    areasResult,
    goalsResult,
    { data: taskRows },
    { data: noteRows },
    { data: noteJunctionRows },
    { data: resourceRows },
  ] = await Promise.all([
    supabase.from("project_areas").select("area_id").eq("project_id", projectId),
    supabase.from("goal_projects").select("goal_id").eq("project_id", projectId),
    supabase
      .from("tasks")
      .select("project_id, is_completed, is_archived")
      .eq("project_id", projectId),
    supabase
      .from("notes")
      .select("id, project_id, status, is_archived")
      .eq("project_id", projectId),
    supabase
      .from("note_projects")
      .select("project_id, note:notes(id, status, is_archived)")
      .eq("project_id", projectId),
    supabase
      .from("resources")
      .select("project_id, status, is_archived")
      .eq("project_id", projectId),
  ])

  const linkedGoalIds = (goalsResult.data ?? []).map((r: { goal_id: string }) => r.goal_id)
  // Active goal lookup: same predicate as the inline computations across the
  // app (matches projectService.hydrateProjectRollupCounts).
  let activeGoalIdSet = new Set<string>()
  if (linkedGoalIds.length > 0) {
    const { data: goalsData } = await supabase
      .from("goals")
      .select("id, is_completed, is_archived")
      .in("id", linkedGoalIds)
    activeGoalIdSet = new Set(
      ((goalsData ?? []) as Array<{ id: string; is_completed: boolean; is_archived: boolean }>)
        .filter((g) => !g.is_completed && !g.is_archived)
        .map((g) => g.id),
    )
  }

  // Build rollup counts (active filter applied) — mirrors
  // hydrateProjectRollupCounts in project.service.ts.
  const NOTE_ACTIVE = new Set(["inbox", "to_review", "active"])
  const RESOURCE_ACTIVE = new Set(["inbox", "to_review", "active"])
  const seenNotes = new Set<string>()
  let activeTaskCount = 0
  let activeNoteCount = 0
  let activeResourceCount = 0
  // For progress
  let totalTasks = 0
  let totalNotes = 0
  let totalResources = 0
  let completedTasks = 0
  let completedNotes = 0
  let completedResources = 0
  const seenAllNotes = new Set<string>()
  for (const t of (taskRows ?? []) as Array<{ is_completed: boolean; is_archived: boolean }>) {
    if (t.is_archived) continue
    totalTasks += 1
    if (t.is_completed) completedTasks += 1
    if (!t.is_completed) activeTaskCount += 1
  }
  for (const n of (noteRows ?? []) as Array<{ id: string; status: string; is_archived: boolean }>) {
    if (n.is_archived) continue
    if (n.status !== "archive" && !seenAllNotes.has(n.id)) {
      seenAllNotes.add(n.id)
      totalNotes += 1
      if (n.status === "saved") completedNotes += 1
    }
    if (NOTE_ACTIVE.has(n.status) && !seenNotes.has(n.id)) {
      seenNotes.add(n.id)
      activeNoteCount += 1
    }
  }
  for (const link of (noteJunctionRows ?? []) as Array<{
    note: { id: string; status: string; is_archived: boolean } | { id: string; status: string; is_archived: boolean }[] | null
  }>) {
    const note = Array.isArray(link.note) ? link.note[0] : link.note
    if (!note || note.is_archived) continue
    if (note.status !== "archive" && !seenAllNotes.has(note.id)) {
      seenAllNotes.add(note.id)
      totalNotes += 1
      if (note.status === "saved") completedNotes += 1
    }
    if (NOTE_ACTIVE.has(note.status) && !seenNotes.has(note.id)) {
      seenNotes.add(note.id)
      activeNoteCount += 1
    }
  }
  for (const r of (resourceRows ?? []) as Array<{ status: string; is_archived: boolean }>) {
    if (r.is_archived) continue
    totalResources += 1
    if (r.status === "saved") completedResources += 1
    if (RESOURCE_ACTIVE.has(r.status)) activeResourceCount += 1
  }
  const goalCount = linkedGoalIds.filter((id: string) => activeGoalIdSet.has(id)).length

  const totalItems = totalTasks + totalNotes + totalResources
  const completedItems = completedTasks + completedNotes + completedResources
  let progress: number
  if (project.status === "completed") {
    progress = 100
  } else if (totalItems > 0) {
    progress = Math.round((completedItems / totalItems) * 100)
  } else {
    progress = project.progress ?? 0
  }

  return {
    ...project,
    progress,
    linkedAreaIds: dedupe([project.area_id, ...(areasResult.data ?? []).map((r: { area_id: string }) => r.area_id)]),
    linkedGoalIds,
    goalCount,
    taskCount: activeTaskCount,
    noteCount: activeNoteCount,
    resourceCount: activeResourceCount,
  }
}

export async function serverFetchProjectByIdentifier(
  supabase: SupabaseClient,
  userId: string,
  identifier: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let project: any = null

  if (isUuid(identifier)) {
    const { data } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId)
      .eq("id", identifier)
      .maybeSingle()
    project = data
  } else {
    const { data } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId)
      .eq("slug", identifier)
      .maybeSingle()
    project = data
  }

  if (!project) return null
  return hydrateProject(supabase, project)
}

export async function serverFetchProjectWithRelations(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ goal_ids: string[]; area_ids: string[] }> {
  const [goalResult, areaResult] = await Promise.all([
    supabase.from("goal_projects").select("goal_id").eq("project_id", projectId),
    supabase.from("project_areas").select("area_id").eq("project_id", projectId),
  ])
  return {
    goal_ids: (goalResult.data ?? []).map((r: { goal_id: string }) => r.goal_id),
    area_ids: (areaResult.data ?? []).map((r: { area_id: string }) => r.area_id),
  }
}

export async function serverFetchResourcesByProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  const { data } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ ...r, linkedAreaIds: dedupe([r.area_id]) }))
}

export async function serverFetchContactsByProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Array<{ contact_id: string; project_id: string; role_in_project: string | null }>> {
  const { data } = await supabase
    .from("contact_projects")
    .select("contact_id, project_id, role_in_project")
    .eq("project_id", projectId)
  return data ?? []
}
