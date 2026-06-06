import type { SupabaseClient } from "@supabase/supabase-js"

import { serverFetchGoals } from "@/lib/queries/goals.queries"
import { hydrateNotebooks } from "@/lib/queries/notes.queries"
import { hydrateProjectRollupCounts } from "@/lib/queries/projects.queries"

const AREA_SELECT =
  "id, user_id, name, description, icon, color, type, metadata, inactive, archive, slug, created_at, updated_at"
const PROJECT_SELECT =
  "id, user_id, area_id, name, description, status, priority, start_date, due_date, progress, is_archived, slug, created_at, updated_at"
const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at"
const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, content, type, status, favorite, pin, is_archived, metadata, created_at, updated_at"
const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at"

const NOTE_ACTIVE = new Set(["inbox", "to_review", "active"])
const RESOURCE_ACTIVE = new Set(["inbox", "to_review", "active"])

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((x): x is string => Boolean(x))))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateProjectAreaIds(supabase: SupabaseClient, projects: any[]): Promise<any[]> {
  if (projects.length === 0) return projects
  const projectIds = projects.map((p) => p.id as string)
  const { data, error } = await supabase
    .from("project_areas")
    .select("project_id, area_id")
    .in("project_id", projectIds)
  // If the join table doesn't exist (legacy schema), fall back to area_id only.
  if (error || !data || data.length === 0) {
    return projects.map((p) => ({ ...p, linkedAreaIds: dedupe([p.area_id]) }))
  }
  const areasByProject = new Map<string, string[]>()
  for (const link of data) {
    const list = areasByProject.get(link.project_id) ?? []
    list.push(link.area_id)
    areasByProject.set(link.project_id, list)
  }
  return projects.map((p) => ({
    ...p,
    linkedAreaIds: dedupe([p.area_id, ...(areasByProject.get(p.id) ?? [])]),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateProjectGoalIds(supabase: SupabaseClient, projects: any[]): Promise<any[]> {
  if (projects.length === 0) return projects
  const projectIds = projects.map((p) => p.id as string)
  const { data } = await supabase
    .from("goal_projects")
    .select("project_id, goal_id")
    .in("project_id", projectIds)
  const goalsByProject = new Map<string, string[]>()
  for (const link of data ?? []) {
    const list = goalsByProject.get(link.project_id) ?? []
    list.push(link.goal_id)
    goalsByProject.set(link.project_id, list)
  }
  return projects.map((p) => ({
    ...p,
    linkedGoalIds: goalsByProject.get(p.id) ?? [],
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateProjectRelations(supabase: SupabaseClient, projects: any[]): Promise<any[]> {
  const withAreas = await hydrateProjectAreaIds(supabase, projects)
  return hydrateProjectGoalIds(supabase, withAreas)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateTaskAreaIds(supabase: SupabaseClient, tasks: any[]): Promise<any[]> {
  if (tasks.length === 0) return tasks
  const taskIds = tasks.map((t) => t.id as string)
  const { data, error } = await supabase
    .from("task_areas")
    .select("task_id, area_id")
    .in("task_id", taskIds)
  if (error || !data || data.length === 0) {
    return tasks.map((t) => ({ ...t, linkedAreaIds: dedupe([t.area_id]) }))
  }
  const areasByTask = new Map<string, string[]>()
  for (const link of data) {
    const list = areasByTask.get(link.task_id) ?? []
    list.push(link.area_id)
    areasByTask.set(link.task_id, list)
  }
  return tasks.map((t) => ({
    ...t,
    linkedAreaIds: dedupe([t.area_id, ...(areasByTask.get(t.id) ?? [])]),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateTaskGoalIds(supabase: SupabaseClient, tasks: any[]): Promise<any[]> {
  if (tasks.length === 0) return tasks
  const taskIds = tasks.map((t) => t.id as string)
  const { data } = await supabase
    .from("goal_tasks")
    .select("task_id, goal_id")
    .in("task_id", taskIds)
  const goalsByTask = new Map<string, string[]>()
  for (const link of data ?? []) {
    const list = goalsByTask.get(link.task_id) ?? []
    list.push(link.goal_id)
    goalsByTask.set(link.task_id, list)
  }
  return tasks.map((t) => ({
    ...t,
    linkedGoalIds: goalsByTask.get(t.id) ?? [],
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateTaskRelations(supabase: SupabaseClient, tasks: any[]): Promise<any[]> {
  const withAreas = await hydrateTaskAreaIds(supabase, tasks)
  return hydrateTaskGoalIds(supabase, withAreas)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateNoteProjectIds(supabase: SupabaseClient, notes: any[]): Promise<any[]> {
  if (notes.length === 0) return notes
  const noteIds = notes.map((n) => n.id as string)
  const { data } = await supabase
    .from("note_projects")
    .select("note_id, project_id")
    .in("note_id", noteIds)
  if (!data || data.length === 0) {
    return notes.map((n) => ({ ...n, linkedProjectIds: dedupe([n.project_id]) }))
  }
  const projectsByNote = new Map<string, string[]>()
  for (const link of data) {
    const list = projectsByNote.get(link.note_id) ?? []
    list.push(link.project_id)
    projectsByNote.set(link.note_id, list)
  }
  return notes.map((n) => ({
    ...n,
    linkedProjectIds: dedupe([n.project_id, ...(projectsByNote.get(n.id) ?? [])]),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateNoteAreaIds(supabase: SupabaseClient, notes: any[]): Promise<any[]> {
  if (notes.length === 0) return notes
  const noteIds = notes.map((n) => n.id as string)
  const { data, error } = await supabase
    .from("note_areas")
    .select("note_id, area_id")
    .in("note_id", noteIds)
  if (error || !data || data.length === 0) {
    return notes.map((n) => ({ ...n, linkedAreaIds: dedupe([n.area_id]) }))
  }
  const areasByNote = new Map<string, string[]>()
  for (const link of data) {
    const list = areasByNote.get(link.note_id) ?? []
    list.push(link.area_id)
    areasByNote.set(link.note_id, list)
  }
  return notes.map((n) => ({
    ...n,
    linkedAreaIds: dedupe([n.area_id, ...(areasByNote.get(n.id) ?? [])]),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateResourceAreaIds(supabase: SupabaseClient, resources: any[]): Promise<any[]> {
  if (resources.length === 0) return resources
  const resourceIds = resources.map((r) => r.id as string)
  const { data, error } = await supabase
    .from("resource_areas")
    .select("resource_id, area_id")
    .in("resource_id", resourceIds)
  if (error || !data || data.length === 0) {
    return resources.map((r) => ({ ...r, linkedAreaIds: dedupe([r.area_id]) }))
  }
  const areasByResource = new Map<string, string[]>()
  for (const link of data) {
    const list = areasByResource.get(link.resource_id) ?? []
    list.push(link.area_id)
    areasByResource.set(link.resource_id, list)
  }
  return resources.map((r) => ({
    ...r,
    linkedAreaIds: dedupe([r.area_id, ...(areasByResource.get(r.id) ?? [])]),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateNoteGoalIds(supabase: SupabaseClient, notes: any[]): Promise<any[]> {
  if (notes.length === 0) return notes
  const noteIds = notes.map((n) => n.id as string)
  const { data } = await supabase
    .from("goal_notes")
    .select("note_id, goal_id")
    .in("note_id", noteIds)
  const goalsByNote = new Map<string, string[]>()
  for (const link of data ?? []) {
    const list = goalsByNote.get(link.note_id) ?? []
    list.push(link.goal_id)
    goalsByNote.set(link.note_id, list)
  }
  return notes.map((n) => ({ ...n, linkedGoalIds: goalsByNote.get(n.id) ?? [] }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateNoteTaskIds(supabase: SupabaseClient, notes: any[]): Promise<any[]> {
  if (notes.length === 0) return notes
  const noteIds = notes.map((n) => n.id as string)
  const { data } = await supabase
    .from("task_notes")
    .select("note_id, task_id")
    .in("note_id", noteIds)
  const tasksByNote = new Map<string, string[]>()
  for (const link of data ?? []) {
    const list = tasksByNote.get(link.note_id) ?? []
    list.push(link.task_id)
    tasksByNote.set(link.note_id, list)
  }
  return notes.map((n) => ({ ...n, linkedTaskIds: tasksByNote.get(n.id) ?? [] }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateResourceGoalIds(supabase: SupabaseClient, resources: any[]): Promise<any[]> {
  if (resources.length === 0) return resources
  const resourceIds = resources.map((r) => r.id as string)
  const { data } = await supabase
    .from("goal_resources")
    .select("resource_id, goal_id")
    .in("resource_id", resourceIds)
  const goalsByResource = new Map<string, string[]>()
  for (const link of data ?? []) {
    const list = goalsByResource.get(link.resource_id) ?? []
    list.push(link.goal_id)
    goalsByResource.set(link.resource_id, list)
  }
  return resources.map((r) => ({ ...r, linkedGoalIds: goalsByResource.get(r.id) ?? [] }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateResourceTaskIds(supabase: SupabaseClient, resources: any[]): Promise<any[]> {
  if (resources.length === 0) return resources
  const resourceIds = resources.map((r) => r.id as string)
  const { data } = await supabase
    .from("task_resources")
    .select("resource_id, task_id")
    .in("resource_id", resourceIds)
  const tasksByResource = new Map<string, string[]>()
  for (const link of data ?? []) {
    const list = tasksByResource.get(link.resource_id) ?? []
    list.push(link.task_id)
    tasksByResource.set(link.resource_id, list)
  }
  return resources.map((r) => ({ ...r, linkedTaskIds: tasksByResource.get(r.id) ?? [] }))
}

async function fetchLinkedIds(
  supabase: SupabaseClient,
  table: string,
  fkColumn: string,
  areaId: string,
): Promise<string[]> {
  const { data } = await supabase.from(table).select(fkColumn).eq("area_id", areaId)
  return ((data as unknown as Record<string, string>[]) ?? [])
    .map((r) => r[fkColumn])
    .filter(Boolean)
}

export async function serverFetchAreaDetail(
  supabase: SupabaseClient,
  userId: string,
  areaIdentifier: string,
) {
  // Fetch area by slug → fallback to UUID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let area: any = null
  const { data: slugArea } = await supabase
    .from("areas")
    .select(AREA_SELECT)
    .eq("user_id", userId)
    .eq("slug", areaIdentifier)
    .maybeSingle()
  if (slugArea) {
    area = slugArea
  } else if (isUuid(areaIdentifier)) {
    const { data: uuidArea } = await supabase
      .from("areas")
      .select(AREA_SELECT)
      .eq("user_id", userId)
      .eq("id", areaIdentifier)
      .maybeSingle()
    area = uuidArea
  }
  if (!area) throw new Error(`Area not found: ${areaIdentifier}`)
  const areaId: string = area.id

  // Fetch ALL user goals/projects/tasks/notes/resources first so we can compute
  // the "linked" subset for this area AND attach the full global lists
  // (allGoals/allTasks/allNotes/allResources/archivedTasks) needed by the
  // detail content for project rollups, goal lookups, etc.
  const [
    allProjectsResult,
    allTasksActiveResult,
    allTasksArchivedResult,
    allNotesResult,
    allResourcesResult,
    allGoals,
    extraGoalIds,
    extraProjectIds,
    extraTaskIds,
  ] = await Promise.all([
    supabase.from("projects").select(PROJECT_SELECT).eq("user_id", userId),
    supabase.from("tasks").select(TASK_SELECT).eq("user_id", userId).eq("is_archived", false),
    supabase.from("tasks").select(TASK_SELECT).eq("user_id", userId).eq("is_archived", true),
    supabase.from("notes").select(NOTE_SELECT).eq("user_id", userId).eq("is_archived", false),
    supabase.from("resources").select(RESOURCE_SELECT).eq("user_id", userId).eq("is_archived", false),
    serverFetchGoals(supabase, userId, { status: "all" }),
    fetchLinkedIds(supabase, "goal_areas", "goal_id", areaId),
    fetchLinkedIds(supabase, "project_areas", "project_id", areaId),
    fetchLinkedIds(supabase, "task_areas", "task_id", areaId),
  ])

  const rawAllProjects = allProjectsResult.data ?? []
  const rawAllActiveTasks = allTasksActiveResult.data ?? []
  const rawAllArchivedTasks = allTasksArchivedResult.data ?? []
  const rawAllNotes = allNotesResult.data ?? []
  const rawAllResources = allResourcesResult.data ?? []

  // Hydrate the global goal/project/task/note/resource collections with relation
  // IDs and (for goals) rollup counts + progress so cards on the area detail
  // page render accurate correlation numbers on first paint.
  const [
    allProjects,
    allTasks,
    archivedTasks,
    allNotesWithProjects,
    allResourcesWithAreas,
  ] = await Promise.all([
    hydrateProjectRelations(supabase, rawAllProjects),
    hydrateTaskRelations(supabase, rawAllActiveTasks),
    hydrateTaskRelations(supabase, rawAllArchivedTasks),
    hydrateNoteProjectIds(supabase, rawAllNotes),
    hydrateResourceAreaIds(supabase, rawAllResources),
  ])
  const allProjectsWithRollups = await hydrateProjectRollupCounts(supabase, allProjects)
  const allNotesWithAreas = await hydrateNoteAreaIds(supabase, allNotesWithProjects)
  const allNotesWithGoals = await hydrateNoteGoalIds(supabase, allNotesWithAreas)
  const allNotesWithTasks = await hydrateNoteTaskIds(supabase, allNotesWithGoals)
  const allNotes = await hydrateNotebooks(supabase, allNotesWithTasks)
  const allResourcesWithGoals = await hydrateResourceGoalIds(supabase, allResourcesWithAreas)
  const allResources = await hydrateResourceTaskIds(supabase, allResourcesWithGoals)

  // Resolve names for topics referenced by linked resources so topic bubbles
  // render on first paint instead of waiting on the client-only useTopics hook.
  const topicIdSet = new Set<string>()
  for (const resource of allResources) {
    const topicId = (resource as { topic_id?: string | null }).topic_id
    if (topicId) topicIdSet.add(topicId)
  }
  let topicNames: { id: string; name: string }[] = []
  if (topicIdSet.size > 0) {
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", [...topicIdSet])
    topicNames = (topicRows ?? []).map((t) => ({ id: t.id as string, name: t.name as string }))
  }

  // Compute "linked to this area" subsets using junction-aware matching so the
  // area detail header, areas list cards, and contact detail area cards all
  // agree on what counts as linked. Mirrors getAreaRollups + the matchers in
  // src/lib/utils/{goals,projects,tasks,notes}.ts.
  const isLinkedToArea = (
    entity: { area_id?: string | null; linkedAreaIds?: string[] },
  ): boolean =>
    entity.area_id === areaId || (entity.linkedAreaIds ?? []).includes(areaId)

  const goals = allGoals.filter(
    (g) => isLinkedToArea(g) || extraGoalIds.includes((g as { id: string }).id),
  )
  const projects = allProjectsWithRollups.filter(
    (p) => isLinkedToArea(p) || extraProjectIds.includes((p as { id: string }).id),
  )
  const tasks = allTasks.filter(
    (t) => isLinkedToArea(t) || extraTaskIds.includes((t as { id: string }).id),
  )
  const linkedArchivedTasks = archivedTasks.filter(
    (t) => isLinkedToArea(t) || extraTaskIds.includes((t as { id: string }).id),
  )
  const notes = allNotes.filter((n) => isLinkedToArea(n))
  const resources = allResources.filter((r) => isLinkedToArea(r))

  return {
    area,
    goals,
    allGoals,
    projects,
    tasks,
    archivedTasks: linkedArchivedTasks,
    notes,
    resources,
    allTasks,
    allNotes,
    allResources,
    topicNames,
    rollups: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      goalCount: goals.filter((g: any) => !g.is_archived && !g.is_completed).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectCount: projects.filter((p: any) => !p.is_archived && p.status !== "completed").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskCount: tasks.filter((t: any) => !t.is_archived && !t.is_completed).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      noteCount: notes.filter((n: any) => !n.is_archived && NOTE_ACTIVE.has(n.status)).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resourceCount: resources.filter((r: any) => !r.is_archived && RESOURCE_ACTIVE.has(r.status)).length,
    },
  }
}
