import type { SupabaseClient } from "@supabase/supabase-js"
import { calculateGoalProgress } from "@/lib/utils/goals"

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at"

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
  const { data } = await supabase
    .from("project_areas")
    .select("project_id, area_id")
    .in("project_id", projectIds)
  if (!data || data.length === 0) {
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

export async function serverFetchGoalDetail(
  supabase: SupabaseClient,
  userId: string,
  goalIdentifier: string,
) {
  // Fetch goal: try slug first, then UUID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let goal: any = null
  const { data: slugData } = await supabase
    .from("goals")
    .select(GOAL_SELECT)
    .eq("user_id", userId)
    .eq("slug", goalIdentifier)
    .maybeSingle()
  if (slugData) {
    goal = slugData
  } else if (isUuid(goalIdentifier)) {
    const { data: uuidData } = await supabase
      .from("goals")
      .select(GOAL_SELECT)
      .eq("user_id", userId)
      .eq("id", goalIdentifier)
      .maybeSingle()
    goal = uuidData
  }

  if (!goal) throw new Error(`Goal not found: ${goalIdentifier}`)
  const goalId: string = goal.id

  // Parallel: goal area links + all linked entities via junction tables
  const [
    goalAreasResult,
    goalProjectsResult,
    goalTasksResult,
    goalNotesResult,
    goalResourcesResult,
  ] = await Promise.all([
    supabase.from("goal_areas").select("area_id").eq("goal_id", goalId),
    supabase.from("goal_projects").select("project:projects(*)").eq("goal_id", goalId),
    supabase.from("goal_tasks").select("task:tasks(*)").eq("goal_id", goalId),
    supabase.from("goal_notes").select("note:notes(*)").eq("goal_id", goalId),
    supabase.from("goal_resources").select("resource:resources(*)").eq("goal_id", goalId),
  ])

  // Hydrate goal with linked area IDs
  const goalAreaIds = (goalAreasResult.data ?? []).map((r: { area_id: string }) => r.area_id)

  // Extract raw linked entities
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawProjects: any[] = (goalProjectsResult.data ?? []).map((r: any) => r.project).filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTasks: any[] = (goalTasksResult.data ?? []).map((r: any) => r.task).filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawNotes: any[] = (goalNotesResult.data ?? []).map((r: any) => r.note).filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawResources: any[] = (goalResourcesResult.data ?? []).map((r: any) => r.resource).filter(Boolean)

  // Hydrate goal with the same shape as goalService.list/getByIdentifier:
  // linkedAreaIds + recomputed progress + rollup counts. Mirrors
  // hydrateGoalRollupCounts + hydrateGoalProgress in goal.service.ts so the
  // goal detail page header (which reads goal.progress / goal.projectCount /
  // goal.taskCount / goal.noteCount / goal.resourceCount) renders the same
  // numbers as goal cards on every other surface.
  const goalProjectIds = new Set<string>(rawProjects.map((p) => p.id as string))

  // Live project progress: compute from ALL items belonging to each linked
  // project (mirrors hydrateGoalProgress in goal.service.ts which queries the
  // base tables by project_id).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectsWithLiveProgress: any[] = rawProjects.map((p) => p)
  if (rawProjects.length > 0) {
    const projectIdsArr = rawProjects.map((p) => p.id as string)
    const [
      { data: projTaskRows },
      { data: projNoteRows },
      { data: projNoteJunctionRows },
      { data: projResourceRows },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("project_id, is_completed, is_archived")
        .in("project_id", projectIdsArr),
      supabase
        .from("notes")
        .select("id, project_id, status, is_archived")
        .in("project_id", projectIdsArr),
      supabase
        .from("note_projects")
        .select("project_id, note:notes(id, status, is_archived)")
        .in("project_id", projectIdsArr),
      supabase
        .from("resources")
        .select("project_id, status, is_archived")
        .in("project_id", projectIdsArr),
    ])
    const projTasks = new Map<string, Array<{ is_completed: boolean; is_archived: boolean }>>()
    const projNotes = new Map<string, Array<{ id: string; status: string; is_archived: boolean }>>()
    const projResources = new Map<string, Array<{ status: string; is_archived: boolean }>>()
    for (const t of (projTaskRows ?? []) as Array<{
      project_id: string | null
      is_completed: boolean
      is_archived: boolean
    }>) {
      if (!t.project_id) continue
      const arr = projTasks.get(t.project_id) ?? []
      arr.push({ is_completed: t.is_completed, is_archived: t.is_archived })
      projTasks.set(t.project_id, arr)
    }
    const seenNotes = new Map<string, Set<string>>()
    for (const n of (projNoteRows ?? []) as Array<{
      id: string
      project_id: string | null
      status: string
      is_archived: boolean
    }>) {
      if (!n.project_id) continue
      const arr = projNotes.get(n.project_id) ?? []
      const seen = seenNotes.get(n.project_id) ?? new Set<string>()
      if (!seen.has(n.id)) {
        arr.push({ id: n.id, status: n.status, is_archived: n.is_archived })
        seen.add(n.id)
      }
      projNotes.set(n.project_id, arr)
      seenNotes.set(n.project_id, seen)
    }
    for (const link of (projNoteJunctionRows ?? []) as Array<{
      project_id: string
      note: { id: string; status: string; is_archived: boolean } | { id: string; status: string; is_archived: boolean }[]
    }>) {
      const note = Array.isArray(link.note) ? link.note[0] : link.note
      if (!note) continue
      const arr = projNotes.get(link.project_id) ?? []
      const seen = seenNotes.get(link.project_id) ?? new Set<string>()
      if (!seen.has(note.id)) {
        arr.push({ id: note.id, status: note.status, is_archived: note.is_archived })
        seen.add(note.id)
      }
      projNotes.set(link.project_id, arr)
      seenNotes.set(link.project_id, seen)
    }
    for (const r of (projResourceRows ?? []) as Array<{
      project_id: string | null
      status: string
      is_archived: boolean
    }>) {
      if (!r.project_id) continue
      const arr = projResources.get(r.project_id) ?? []
      arr.push({ status: r.status, is_archived: r.is_archived })
      projResources.set(r.project_id, arr)
    }
    for (let i = 0; i < projectsWithLiveProgress.length; i++) {
      const p = projectsWithLiveProgress[i]
      const pTasks = (projTasks.get(p.id) ?? []).filter((t) => !t.is_archived)
      const pNotes = (projNotes.get(p.id) ?? []).filter((n) => !n.is_archived && n.status !== "archive")
      const pResources = (projResources.get(p.id) ?? []).filter((r) => !r.is_archived)
      const pTotal = pTasks.length + pNotes.length + pResources.length
      if (pTotal === 0) continue
      const pCompleted =
        pTasks.filter((t) => t.is_completed).length +
        pNotes.filter((n) => n.status === "saved").length +
        pResources.filter((r) => r.status === "saved").length
      projectsWithLiveProgress[i] = { ...p, progress: Math.round((pCompleted / pTotal) * 100) }
    }
  }

  // For unlinked items we need each note's set of linked projects to know
  // whether it is covered by a goal-linked project (matches hydrateGoalProgress).
  const goalNoteIds = rawNotes.map((n) => n.id as string)
  const noteProjectIdsByNoteId = new Map<string, Set<string>>()
  if (goalNoteIds.length > 0) {
    const { data: noteProjectRows } = await supabase
      .from("note_projects")
      .select("note_id, project_id")
      .in("note_id", goalNoteIds)
    for (const row of (noteProjectRows ?? []) as Array<{ note_id: string; project_id: string }>) {
      const set = noteProjectIdsByNoteId.get(row.note_id) ?? new Set<string>()
      set.add(row.project_id)
      noteProjectIdsByNoteId.set(row.note_id, set)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unlinkedTasksForProgress = goalProjectIds.size === 0
    ? rawTasks
    : rawTasks.filter((t: any) => !t.project_id || !goalProjectIds.has(t.project_id))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unlinkedNotesForProgress = goalProjectIds.size === 0
    ? rawNotes
    : rawNotes.filter((n: any) => {
        if (n.project_id && goalProjectIds.has(n.project_id)) return false
        const junctionIds = noteProjectIdsByNoteId.get(n.id)
        if (junctionIds) {
          for (const pid of junctionIds) {
            if (goalProjectIds.has(pid)) return false
          }
        }
        return true
      })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unlinkedResourcesForProgress = goalProjectIds.size === 0
    ? rawResources
    : rawResources.filter((r: any) => !r.project_id || !goalProjectIds.has(r.project_id))

  const liveProgress = calculateGoalProgress(
    goal,
    projectsWithLiveProgress,
    unlinkedTasksForProgress,
    unlinkedNotesForProgress,
    unlinkedResourcesForProgress,
  )

  // Active rollup counts (mirrors hydrateGoalRollupCounts in goal.service.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeProjectCount = rawProjects.filter((p: any) => !p.is_archived && p.status !== "completed").length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeTaskCount = rawTasks.filter((t: any) => !t.is_archived && !t.is_completed).length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeNoteCount = rawNotes.filter((n: any) => !n.is_archived && n.status !== "archive" && n.status !== "saved").length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeResourceCount = rawResources.filter((r: any) => !r.is_archived && r.status !== "saved").length

  const hydratedGoal = {
    ...goal,
    progress: liveProgress,
    linkedAreaIds: dedupe([goal.area_id, ...goalAreaIds]),
    projectCount: activeProjectCount,
    taskCount: activeTaskCount,
    noteCount: activeNoteCount,
    resourceCount: activeResourceCount,
  }

  // Hydrate projects with linkedAreaIds (from project_areas) + ALL linkedGoalIds
  // (the full set of goals each project is linked to globally, NOT just the
  // current goal). This is required for the project card "goals" rollup on the
  // goal detail page to show the correct cross-goal correlation count.
  const projectIds = rawProjects.map((p) => p.id as string)
  const { data: allProjectGoalLinks } =
    projectIds.length > 0
      ? await supabase
          .from("goal_projects")
          .select("project_id, goal_id")
          .in("project_id", projectIds)
      : { data: [] }
  const goalsByProjectId = new Map<string, string[]>()
  for (const link of (allProjectGoalLinks ?? []) as Array<{
    project_id: string
    goal_id: string
  }>) {
    const list = goalsByProjectId.get(link.project_id) ?? []
    list.push(link.goal_id)
    goalsByProjectId.set(link.project_id, list)
  }
  const projectsWithLinkedGoals = rawProjects.map((p) => ({
    ...p,
    linkedGoalIds: goalsByProjectId.get(p.id) ?? [goalId],
  }))
  const projects = await hydrateProjectAreaIds(supabase, projectsWithLinkedGoals)

  // Hydrate notes with linkedProjectIds (from note_projects)
  const notes = await hydrateNoteProjectIds(supabase, rawNotes)

  // Tasks: attach linkedGoalIds + basic linkedAreaIds from area_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = rawTasks.map((t: any) => ({
    ...t,
    linkedGoalIds: [goalId],
    linkedAreaIds: dedupe([t.area_id]),
  }))

  // Resources: mark linkedGoalIds + basic linkedAreaIds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resources = rawResources.map((r: any) => ({
    ...r,
    linkedGoalIds: [goalId],
    linkedAreaIds: dedupe([r.area_id]),
  }))

  const NOTE_ACTIVE = new Set(["inbox", "to_review", "active"])
  const RESOURCE_ACTIVE = new Set(["inbox", "to_review", "active"])

  return {
    goal: hydratedGoal,
    projects,
    tasks,
    notes,
    resources,
    extraGoalNames: [],
    extraTaskNames: [],
    rollups: {
      projectCount: projects.length,
      taskCount: tasks.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedTaskCount: tasks.filter((t: any) => t.is_completed).length,
      noteCount: notes.length,
      resourceCount: resources.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeProjectCount: projects.filter((p: any) => !p.is_archived && p.status !== "completed").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeTaskCount: tasks.filter((t: any) => !t.is_archived && !t.is_completed).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeNoteCount: notes.filter((n: any) => !n.is_archived && NOTE_ACTIVE.has(n.status)).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeResourceCount: resources.filter((r: any) => !r.is_archived && RESOURCE_ACTIVE.has(r.status)).length,
    },
  }
}
