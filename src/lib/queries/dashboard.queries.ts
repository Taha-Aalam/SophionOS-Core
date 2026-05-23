import type { SupabaseClient } from "@supabase/supabase-js"
import { getLocalDateEnd, getLocalDateStart, getWeekStart } from "../utils/dates"
import type { TodayData, ActivityItem, ActivityEntityType } from "../services/dashboard.service"

async function serverFetchRecentActivity(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivityItem[]> {
  const [tasksResult, goalsResult, projectsResult, areasResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("goals")
      .select("id, title, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("id, name, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("areas")
      .select("id, name, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
  ])

  const activity: ActivityItem[] = [
    ...(tasksResult.data ?? []).map((t) => ({
      id: t.id,
      entityType: "task" as ActivityEntityType,
      entityId: t.id,
      title: t.title,
      description: t.description,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    ...(goalsResult.data ?? []).map((g) => ({
      id: g.id,
      entityType: "goal" as ActivityEntityType,
      entityId: g.id,
      title: g.title,
      description: g.description,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    })),
    ...(projectsResult.data ?? []).map((p) => ({
      id: p.id,
      entityType: "project" as ActivityEntityType,
      entityId: p.id,
      title: p.name,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    ...(areasResult.data ?? []).map((a) => ({
      id: a.id,
      entityType: "area" as ActivityEntityType,
      entityId: a.id,
      title: a.name,
      description: a.description,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
  ]

  return activity
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
}

export async function serverFetchDashboardToday(
  supabase: SupabaseClient,
  userId: string,
): Promise<TodayData> {
  const todayStart = getLocalDateStart()
  const todayEnd = getLocalDateEnd()
  const weekStart = getWeekStart()

  const taskSelect = "id, title, description, due_date, priority, status, project_id, area_id, projects(name), goals(title), areas(name)"

  const [dueTodayResult, focusResult, goalsResult, completedWeekResult, activeGoalsCountResult, overdueCountResult, recentActivity] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(taskSelect)
        .eq("user_id", userId)
        .eq("status", "pending")
        .or(`due_date.gte.${todayStart},due_date.lte.${todayEnd}`)
        .order("due_date", { ascending: true }),
      supabase
        .from("tasks")
        .select(taskSelect)
        .eq("user_id", userId)
        .eq("status", "pending")
        .eq("is_focus", true)
        .limit(20),
      supabase
        .from("goals")
        .select("id, title, description, progress, target_date, area_id, areas(name)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("priority", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("updated_at", weekStart),
      supabase
        .from("goals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending")
        .lt("due_date", todayStart),
      serverFetchRecentActivity(supabase, userId),
    ])

  type TodayTaskRow = NonNullable<typeof dueTodayResult.data>[number]
  const taskMap = new Map<string, TodayTaskRow>()
  for (const t of dueTodayResult.data ?? []) taskMap.set(t.id, t)
  for (const t of focusResult.data ?? []) {
    if (!taskMap.has(t.id)) taskMap.set(t.id, t)
  }

  const todayStartDate = new Date(todayStart)
  const todayTasksFormatted = Array.from(taskMap.values()).map((t) => {
    const dueDate = t.due_date ? new Date(t.due_date) : null
    const isOverdue = dueDate !== null && dueDate < todayStartDate && t.status === "pending"
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: t.priority,
      status: t.status,
      isOverdue,
      projectId: t.project_id,
      projectName: (t.projects?.[0] as { name: string } | undefined)?.name ?? null,
      areaId: t.area_id,
      areaName: (t.areas?.[0] as { name: string } | undefined)?.name ?? null,
    }
  })

  const activeGoals = (goalsResult.data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    progress: g.progress ?? 0,
    targetDate: g.target_date,
    areaName: (g.areas as { name: string }[] | null)?.[0]?.name ?? null,
  }))

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night"

  return {
    greeting,
    tasksTodayCount: todayTasksFormatted.length,
    todayTasks: todayTasksFormatted,
    activeGoals,
    stats: {
      completedThisWeek: completedWeekResult.count ?? 0,
      activeGoalsCount: activeGoalsCountResult.count ?? 0,
      overdueCount: overdueCountResult.count ?? 0,
    },
    recentActivity,
  }
}
