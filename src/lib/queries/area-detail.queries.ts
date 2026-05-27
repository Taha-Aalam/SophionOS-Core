import type { SupabaseClient } from "@supabase/supabase-js"

const AREA_SELECT =
  "id, user_id, name, description, icon, color, type, metadata, inactive, archive, slug, created_at, updated_at"
const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at"
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
async function hydrateGoalAreaLinks(supabase: SupabaseClient, goals: any[]): Promise<any[]> {
  if (goals.length === 0) return goals
  const goalIds = goals.map((g) => g.id as string)
  const { data } = await supabase
    .from("goal_areas")
    .select("goal_id, area_id")
    .in("goal_id", goalIds)
  const areasByGoal = new Map<string, string[]>()
  for (const row of (data ?? []) as Array<{ goal_id: string; area_id: string }>) {
    const list = areasByGoal.get(row.goal_id) ?? []
    list.push(row.area_id)
    areasByGoal.set(row.goal_id, list)
  }
  return goals.map((g) => ({
    ...g,
    linkedAreaIds: dedupe([g.area_id, ...(areasByGoal.get(g.id) ?? [])]),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hydrateGoalRollupCounts(supabase: SupabaseClient, goals: any[]): Promise<any[]> {
  if (goals.length === 0) return goals
  const goalIds = goals.map((g) => g.id as string)

  const [projectLinks, taskLinks, noteLinks, resourceLinks] = await Promise.all([
    supabase
      .from("goal_projects")
      .select("goal_id, project:projects(status, is_archived)")
      .in("goal_id", goalIds)
      .then((r) => r.data ?? []),
    supabase
      .from("goal_tasks")
      .select("goal_id, task:tasks(is_completed, is_archived)")
      .in("goal_id", goalIds)
      .then((r) => r.data ?? []),
    supabase
      .from("goal_notes")
      .select("goal_id, note:notes(status, is_archived)")
      .in("goal_id", goalIds)
      .then((r) => r.data ?? []),
    supabase
      .from("goal_resources")
      .select("goal_id, resource:resources(status, is_archived)")
      .in("goal_id", goalIds)
      .then((r) => r.data ?? []),
  ])

  const countFor = (
    links: Array<{ goal_id: string } & Record<string, unknown>>,
    goalId: string,
    entityKey: string,
    isActive: (entity: Record<string, unknown>) => boolean,
  ): number =>
    links.filter((link) => {
      if (link.goal_id !== goalId) return false
      const entity = Array.isArray(link[entityKey])
        ? (link[entityKey] as Record<string, unknown>[])[0]
        : (link[entityKey] as Record<string, unknown> | undefined)
      return entity != null && isActive(entity)
    }).length

  return goals.map((goal) => {
    const id = goal.id as string
    return {
      ...goal,
      projectCount: countFor(
        projectLinks as Array<{ goal_id: string } & Record<string, unknown>>,
        id,
        "project",
        (e) => !e.is_archived && e.status !== "completed",
      ),
      taskCount: countFor(
        taskLinks as Array<{ goal_id: string } & Record<string, unknown>>,
        id,
        "task",
        (e) => !e.is_archived && !e.is_completed,
      ),
      noteCount: countFor(
        noteLinks as Array<{ goal_id: string } & Record<string, unknown>>,
        id,
        "note",
        (e) => !e.is_archived && e.status !== "archive" && e.status !== "saved",
      ),
      resourceCount: countFor(
        resourceLinks as Array<{ goal_id: string } & Record<string, unknown>>,
        id,
        "resource",
        (e) => !e.is_archived && e.status !== "saved",
      ),
    }
  })
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
    allGoalsResult,
    allProjectsResult,
    allTasksActiveResult,
    allTasksArchivedResult,
    allNotesResult,
    allResourcesResult,
    extraGoalIds,
    extraProjectIds,
    extraTaskIds,
  ] = await Promise.all([
    supabase.from("goals").select(GOAL_SELECT).eq("user_id", userId),
    supabase.from("projects").select(PROJECT_SELECT).eq("user_id", userId),
    supabase.from("tasks").select(TASK_SELECT).eq("user_id", userId).eq("is_archived", false),
    supabase.from("tasks").select(TASK_SELECT).eq("user_id", userId).eq("is_archived", true),
    supabase.from("notes").select(NOTE_SELECT).eq("user_id", userId).eq("is_archived", false),
    supabase.from("resources").select(RESOURCE_SELECT).eq("user_id", userId).eq("is_archived", false),
    fetchLinkedIds(supabase, "goal_areas", "goal_id", areaId),
    fetchLinkedIds(supabase, "project_areas", "project_id", areaId),
    fetchLinkedIds(supabase, "task_areas", "task_id", areaId),
  ])

  const rawAllGoals = allGoalsResult.data ?? []
  const rawAllProjects = allProjectsResult.data ?? []
  const rawAllActiveTasks = allTasksActiveResult.data ?? []
  const rawAllArchivedTasks = allTasksArchivedResult.data ?? []
  const rawAllNotes = allNotesResult.data ?? []
  const rawAllResources = allResourcesResult.data ?? []

  // Hydrate the global goal/project/task/note/resource collections with relation
  // IDs and (for goals) rollup counts + progress so cards on the area detail
  // page render accurate correlation numbers on first paint.
  const [
    allGoalsWithAreas,
    allProjects,
    allTasks,
    archivedTasks,
    allNotesWithProjects,
    allResourcesWithAreas,
  ] = await Promise.all([
    hydrateGoalAreaLinks(supabase, rawAllGoals),
    hydrateProjectRelations(supabase, rawAllProjects),
    hydrateTaskRelations(supabase, rawAllActiveTasks),
    hydrateTaskRelations(supabase, rawAllArchivedTasks),
    hydrateNoteProjectIds(supabase, rawAllNotes),
    hydrateResourceAreaIds(supabase, rawAllResources),
  ])
  const allGoals = await hydrateGoalRollupCounts(supabase, allGoalsWithAreas)
  const allNotes = await hydrateNoteAreaIds(supabase, allNotesWithProjects)
  const allResources = allResourcesWithAreas

  // Compute "linked to this area" subsets using junction-aware matching so the
  // area detail header, areas list cards, and contact detail area cards all
  // agree on what counts as linked. Mirrors getAreaRollups + the matchers in
  // src/lib/utils/{goals,projects,tasks,notes}.ts.
  const isLinkedToArea = (
    entity: { area_id?: string | null; linkedAreaIds?: string[] },
  ): boolean =>
    entity.area_id === areaId || (entity.linkedAreaIds ?? []).includes(areaId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goals = allGoals.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (g: any) => isLinkedToArea(g) || extraGoalIds.includes(g.id),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = allProjects.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => isLinkedToArea(p) || extraProjectIds.includes(p.id),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = allTasks.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => isLinkedToArea(t) || extraTaskIds.includes(t.id),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkedArchivedTasks = archivedTasks.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => isLinkedToArea(t) || extraTaskIds.includes(t.id),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = allNotes.filter((n: any) => isLinkedToArea(n))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resources = allResources.filter((r: any) => isLinkedToArea(r))

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
