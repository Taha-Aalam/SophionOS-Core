import type { SupabaseClient } from "@supabase/supabase-js"
import { getLocalDateEnd, getLocalDateStart, getWeekStart } from "../utils/dates"
import type { TodayData, ActivityItem, ActivityEntityType } from "../services/dashboard.service"
import { userSettingsService } from "../services/user-settings.service"

async function serverFetchRecentActivity(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivityItem[]> {
  const [tasksResult, goalsResult, projectsResult, areasResult] = await Promise.allSettled([
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

  // Degrade gracefully: a rejected source contributes nothing rather than
  // blanking the whole activity feed (fail-fast Promise.all would throw).
  const taskRows = tasksResult.status === "fulfilled" ? (tasksResult.value.data ?? []) : []
  const goalRows = goalsResult.status === "fulfilled" ? (goalsResult.value.data ?? []) : []
  const projectRows = projectsResult.status === "fulfilled" ? (projectsResult.value.data ?? []) : []
  const areaRows = areasResult.status === "fulfilled" ? (areasResult.value.data ?? []) : []

  const activity: ActivityItem[] = [
    ...taskRows.map((t) => ({
      id: t.id,
      entityType: "task" as ActivityEntityType,
      entityId: t.id,
      title: t.title,
      description: t.description,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    ...goalRows.map((g) => ({
      id: g.id,
      entityType: "goal" as ActivityEntityType,
      entityId: g.id,
      title: g.title,
      description: g.description,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    })),
    ...projectRows.map((p) => ({
      id: p.id,
      entityType: "project" as ActivityEntityType,
      entityId: p.id,
      title: p.name,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    ...areaRows.map((a) => ({
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
  // Resolve "today" in the user's timezone so the dashboard matches their
  // local calendar date regardless of server timezone.
  const prefs = await userSettingsService.getPreferences(userId, { supabase });
  const tz = prefs?.timezone;
  const todayStart = getLocalDateStart(tz)
  const todayEnd = getLocalDateEnd(tz)
  const weekStart = getWeekStart(tz)

  const taskSelect = "id, title, description, due_date, priority, status, project_id, area_id, projects(name), goals(title), areas(name)"

  const [
    dueTodayResult,
    focusResult,
    goalsResult,
    completedWeekResult,
    activeGoalsCountResult,
    overdueCountResult,
    recentActivityResult,
  ] = await Promise.allSettled([
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
        .eq("is_focused", true)
        .limit(20),
      supabase
        .from("goals")
        .select("id, title, description, progress, target_date, area_id, areas(name)")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .eq("is_archived", false)
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
        .eq("is_completed", false)
        .eq("is_archived", false),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending")
        .lt("due_date", todayStart),
      serverFetchRecentActivity(supabase, userId),
    ])

  // Degrade gracefully: each card on the dashboard is an independent data
  // source, so a single rejected query renders empty/zero instead of throwing
  // and blanking the entire page (the fail-fast Promise.all behaviour).
  const dueTodayRows =
    dueTodayResult.status === "fulfilled" ? (dueTodayResult.value.data ?? []) : []
  const focusRows =
    focusResult.status === "fulfilled" ? (focusResult.value.data ?? []) : []
  const goalRows =
    goalsResult.status === "fulfilled" ? (goalsResult.value.data ?? []) : []
  const completedThisWeek =
    completedWeekResult.status === "fulfilled" ? (completedWeekResult.value.count ?? 0) : 0
  const activeGoalsCount =
    activeGoalsCountResult.status === "fulfilled"
      ? (activeGoalsCountResult.value.count ?? 0)
      : 0
  const overdueCount =
    overdueCountResult.status === "fulfilled" ? (overdueCountResult.value.count ?? 0) : 0
  const recentActivity =
    recentActivityResult.status === "fulfilled" ? recentActivityResult.value : []

  type TodayTaskRow = (typeof dueTodayRows)[number]
  const taskMap = new Map<string, TodayTaskRow>()
  for (const t of dueTodayRows) taskMap.set(t.id, t)
  for (const t of focusRows) {
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

  const activeGoals = goalRows.map((g) => ({
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
      completedThisWeek,
      activeGoalsCount,
      overdueCount,
    },
    recentActivity,
  }
}
