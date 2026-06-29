import type { SupabaseClient } from "@supabase/supabase-js"

const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at"
const RESOURCE_SELECT =
  "id, user_id, area_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((x): x is string => Boolean(x))))
}

// Hydrate a resource list with linkedAreaIds/linkedGoalIds/linkedTaskIds so the
// SSR-prefetched cache matches the client hook contract (resourceService
// .hydrateResourceRelations). Without this, goal/task badges only appear after
// a client refetch is triggered by a mutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hydrateResourceLinks(supabase: SupabaseClient, resources: any[]) {
  if (resources.length === 0) return resources
  const ids = resources.map((r) => r.id)
  const [goalLinks, taskLinks] = await Promise.all([
    supabase.from("goal_resources").select("resource_id, goal_id").in("resource_id", ids),
    supabase.from("task_resources").select("resource_id, task_id").in("resource_id", ids),
  ])

  const goalsByResource = new Map<string, string[]>()
  for (const row of (goalLinks.data ?? []) as Array<{ resource_id: string; goal_id: string }>) {
    goalsByResource.set(row.resource_id, [...(goalsByResource.get(row.resource_id) ?? []), row.goal_id])
  }
  const tasksByResource = new Map<string, string[]>()
  for (const row of (taskLinks.data ?? []) as Array<{ resource_id: string; task_id: string }>) {
    tasksByResource.set(row.resource_id, [...(tasksByResource.get(row.resource_id) ?? []), row.task_id])
  }

  return resources.map((r) => ({
    ...r,
    linkedAreaIds: dedupe([r.area_id]),
    linkedGoalIds: goalsByResource.get(r.id) ?? [],
    linkedTaskIds: tasksByResource.get(r.id) ?? [],
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateProject(supabase: SupabaseClient, project: any): Promise<any> {
  const projectId: string = project.id
  // These six sources are independent (all keyed by projectId), so degrade with
  // allSettled — a rejected rollup query yields an empty slice instead of
  // throwing and blanking the entire project detail page.
  const [
    areasResult,
    goalsResult,
    taskResult,
    noteResult,
    noteJunctionResult,
    resourceResult,
  ] = await Promise.allSettled([
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
      .from("resource_projects")
      .select("resource:resources(status, is_archived)")
      .eq("project_id", projectId),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const areaLinkRows: any[] =
    areasResult.status === "fulfilled" ? (areasResult.value.data ?? []) : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goalLinkRows: any[] =
    goalsResult.status === "fulfilled" ? (goalsResult.value.data ?? []) : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRows: any[] = taskResult.status === "fulfilled" ? (taskResult.value.data ?? []) : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteRows: any[] = noteResult.status === "fulfilled" ? (noteResult.value.data ?? []) : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteJunctionRows: any[] =
    noteJunctionResult.status === "fulfilled" ? (noteJunctionResult.value.data ?? []) : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resourceRows: any[] =
    resourceResult.status === "fulfilled" ? (resourceResult.value.data ?? []) : []

  const linkedGoalIds = goalLinkRows.map((r: { goal_id: string }) => r.goal_id)
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
      if (n.status === "completed") completedNotes += 1
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
      if (note.status === "completed") completedNotes += 1
    }
    if (NOTE_ACTIVE.has(note.status) && !seenNotes.has(note.id)) {
      seenNotes.add(note.id)
      activeNoteCount += 1
    }
  }
  for (const link of (resourceRows ?? []) as Array<{
    resource:
      | { status: string; is_archived: boolean }
      | { status: string; is_archived: boolean }[]
      | null;
  }>) {
    const r = Array.isArray(link.resource) ? link.resource[0] : link.resource
    if (!r || r.is_archived) continue
    totalResources += 1
    if (r.status === "completed") completedResources += 1
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
    linkedAreaIds: dedupe([project.area_id, ...areaLinkRows.map((r: { area_id: string }) => r.area_id)]),
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
  const { data: linkRows } = await supabase
    .from("resource_projects")
    .select("resource_id")
    .eq("project_id", projectId)
  const resourceIds = (linkRows ?? []).map((r: { resource_id: string }) => r.resource_id)
  if (resourceIds.length === 0) {
    return hydrateResourceLinks(supabase, [])
  }
  const { data } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .in("id", resourceIds)
    .order("updated_at", { ascending: false })
  return hydrateResourceLinks(supabase, data ?? [])
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
