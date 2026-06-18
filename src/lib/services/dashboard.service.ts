import { createClient } from "../supabase/client";
import { getLocalDateEnd, getLocalDateStart, getWeekStart } from "../utils/dates";

// ─── Activity feed item ────────────────────────────────────────────────────

export type ActivityEntityType = "task" | "goal" | "project" | "area";

export interface ActivityItem {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard data contract ───────────────────────────────────────────────

export interface TodayStats {
  completedThisWeek: number;
  activeGoalsCount: number;
  overdueCount: number;
}

export interface TodayData {
  greeting: string;
  tasksTodayCount: number;
  todayTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    priority: string;
    status: string;
    isOverdue: boolean;
    projectId: string | null;
    projectName: string | null;
    areaId: string | null;
    areaName: string | null;
  }>;
  activeGoals: Array<{
    id: string;
    title: string;
    description: string | null;
    progress: number;
    targetDate: string | null;
    areaName: string | null;
  }>;
  stats: TodayStats;
  recentActivity: ActivityItem[];
}

// ─── Recent activity aggregation ───────────────────────────────────────────

async function getRecentActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = createClient();

  // Fire all four "recent" fetches in parallel — they are independent.
  const [
    { data: tasks },
    { data: goals },
    { data: projects },
    { data: areas },
  ] = await Promise.all([
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
  ]);

  const activity: ActivityItem[] = [
    ...(tasks ?? []).map((t) => ({
      id: t.id,
      entityType: "task" as ActivityEntityType,
      entityId: t.id,
      title: t.title,
      description: t.description,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    ...(goals ?? []).map((g) => ({
      id: g.id,
      entityType: "goal" as ActivityEntityType,
      entityId: g.id,
      title: g.title,
      description: g.description,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    })),
    ...(projects ?? []).map((p) => ({
      id: p.id,
      entityType: "project" as ActivityEntityType,
      entityId: p.id,
      title: p.name,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    ...(areas ?? []).map((a) => ({
      id: a.id,
      entityType: "area" as ActivityEntityType,
      entityId: a.id,
      title: a.name,
      description: a.description,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
  ];

  // Sort by most recently updated, take last 10
  return activity
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 10);
}

// ─── Main service ──────────────────────────────────────────────────────────

export const DASHBOARD_QUERY_KEY = "dashboard";

export const dashboardService = {
  /**
   * Returns all dashboard data for a user's home view.
   */
  async getToday(userId: string): Promise<TodayData> {
    const supabase = createClient();
    const todayStart = getLocalDateStart();
    const todayEnd = getLocalDateEnd();
    const weekStart = getWeekStart();

    const taskSelect =
      "id, title, description, due_date, priority, status, project_id, area_id, projects(name), goals(title), areas(name)";

    // All dashboard reads are independent — run them concurrently instead of
    // awaiting one at a time (was ~9 serial round-trips incl. recent activity).
    const [
      { data: tasksData },
      { data: focusTasks },
      { data: goalsData },
      { count: completedThisWeek },
      { count: activeGoalsCount },
      { count: overdueCount },
      recentActivity,
    ] = await Promise.all([
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
      getRecentActivity(userId),
    ]);

    // Deduplicate: merge focus + due-today, prefer the focus version for duplicates
    type TodayTaskRow = NonNullable<typeof tasksData>[number];
    const taskMap = new Map<string, TodayTaskRow>();
    for (const t of tasksData ?? []) {
      taskMap.set(t.id, t);
    }
    for (const t of focusTasks ?? []) {
      if (!taskMap.has(t.id)) {
        taskMap.set(t.id, t);
      }
    }
    const allTodayTasks = Array.from(taskMap.values());

    const todayStartDate = new Date(todayStart);

    const todayTasksFormatted = allTodayTasks.map((t) => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      const isOverdue =
        dueDate !== null && dueDate < todayStartDate && t.status === "pending";
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
      };
    });

    const activeGoals = (goalsData ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      progress: g.progress ?? 0,
      targetDate: g.target_date,
      areaName: (g.areas as { name: string }[] | null)?.[0]?.name ?? null,
    }));

    return {
      greeting: this.buildGreeting(),
      tasksTodayCount: todayTasksFormatted.length,
      todayTasks: todayTasksFormatted,
      activeGoals,
      stats: {
        completedThisWeek: completedThisWeek ?? 0,
        activeGoalsCount: activeGoalsCount ?? 0,
        overdueCount: overdueCount ?? 0,
      },
      recentActivity,
    };
  },

  buildGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
  },
};