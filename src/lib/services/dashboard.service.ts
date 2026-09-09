import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/client";
import { getLocalDateKey, getWeekStart } from "../utils/dates";
import { buildDashboardAnalytics } from "../analytics/dashboard-analytics";
import type { DashboardAnalytics } from "../analytics/dashboard-analytics";
import { serverFetchAreas } from "../queries/areas.queries";
import { serverFetchGoals } from "../queries/goals.queries";
import { serverFetchProjects } from "../queries/projects.queries";
import { serverFetchTasks } from "../queries/tasks.queries";
import { serverFetchNotes } from "../queries/notes.queries";
import { serverFetchResources } from "../queries/resources.queries";
import { serverFetchTopics } from "../queries/topics.queries";
import { serverFetchContacts } from "../queries/contacts.queries";
import { userSettingsService } from "./user-settings.service";

type ServiceOptions = { supabase?: SupabaseClient };

// Supabase many-to-one embeds return either an object ({name}) or a
// single-element array ([{name}]) depending on the relationship cardinality
// detected. Normalize both shapes to a name string.
function embedName(embed: unknown): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    const first = embed[0] as { name?: string } | undefined;
    return first?.name ?? null;
  }
  if (typeof embed === "object" && embed !== null && "name" in embed) {
    return (embed as { name?: string }).name ?? null;
  }
  return null;
}

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

async function getRecentActivity(
  userId: string,
  sb: SupabaseClient,
): Promise<ActivityItem[]> {
  const supabase = sb;

  // Fire all four "recent" fetches in parallel — they are independent.
  // NOTE: tasks/goals store the display name in `name` (not `title`).
  const [
    { data: tasks },
    { data: goals },
    { data: projects },
    { data: areas },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, name, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("goals")
      .select("id, name, description, created_at, updated_at")
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
    ...(tasks ?? []).map((t) => {
      const row = t as unknown as { name?: string; title?: string };
      return {
        id: t.id,
        entityType: "task" as ActivityEntityType,
        entityId: t.id,
        title: row.name ?? row.title ?? "Untitled",
        description: t.description,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    }),
    ...(goals ?? []).map((g) => {
      const row = g as unknown as { name?: string; title?: string };
      return {
        id: g.id,
        entityType: "goal" as ActivityEntityType,
        entityId: g.id,
        title: row.name ?? row.title ?? "Untitled",
        description: g.description,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      };
    }),
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
  async getToday(userId: string, options?: ServiceOptions): Promise<TodayData> {
    const supabase = options?.supabase ?? createClient();

    // Resolve "today" in the user's timezone so dueToday / overdue / thisWeek
    // match the user's local calendar date regardless of server timezone.
    // due_date is a DATE (YYYY-MM-DD): compare date keys, not ISO timestamps.
    const prefs = await userSettingsService.getPreferences(userId, { supabase });
    const tz = prefs?.timezone;
    const todayKey = getLocalDateKey(tz);
    const weekStart = getWeekStart(tz);

    // tasks/goals store display names in `name`. The `goals(...)` embed is
    // intentionally omitted: tasks link to goals via the goal_tasks junction,
    // not a direct FK, so that embed always errors and would blank the query.
    const taskSelect =
      "id, name, description, due_date, priority, status, is_completed, is_archived, is_focused, project_id, area_id, projects(name), areas(name)";

    // All dashboard reads are independent — run them concurrently instead of
    // awaiting one at a time (was ~9 serial round-trips incl. recent activity).
    // Active = not archived AND not completed (there is no "pending" status;
    // TASK_STATUS is inbox/todo/in_progress/completed/archived).
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
        .eq("is_archived", false)
        .eq("is_completed", false)
        // "Due today" is an exact DATE match — the same local-calendar-date
        // comparison used by get_my_day and list_tasks.
        .eq("due_date", todayKey)
        .order("due_date", { ascending: true }),
      supabase
        .from("tasks")
        .select(taskSelect)
        .eq("user_id", userId)
        .eq("is_archived", false)
        .eq("is_completed", false)
        .eq("is_focused", true)
        .limit(20),
      supabase
        .from("goals")
        .select("id, name, description, progress, target_date, area_id, areas(name)")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .eq("is_archived", false)
        .order("priority", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_completed", true)
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
        .eq("is_archived", false)
        .eq("is_completed", false)
        .lt("due_date", todayKey),
      getRecentActivity(userId, supabase),
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

    const todayTasksFormatted = allTodayTasks.map((t) => {
      // DATE comparison: due_date "2026-08-02" < today "2026-08-03" means overdue.
      const isOverdue =
        t.due_date != null && t.due_date < todayKey && !t.is_completed && !t.is_archived;
      return {
        id: t.id,
        title: (t as { name?: string; title?: string }).name ?? (t as { title?: string }).title ?? "Untitled",
        description: t.description,
        dueDate: t.due_date,
        priority: t.priority,
        status: t.status,
        isOverdue,
        projectId: t.project_id,
        projectName: embedName((t as { projects?: unknown }).projects),
        areaId: t.area_id,
        areaName: embedName((t as { areas?: unknown }).areas),
      };
    });

    const activeGoals = (goalsData ?? []).map((g) => ({
      id: g.id,
      title: (g as { name?: string; title?: string }).name ?? (g as { title?: string }).title ?? "Untitled",
      description: g.description,
      progress: g.progress ?? 0,
      targetDate: g.target_date,
      areaName: embedName((g as { areas?: unknown }).areas),
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

  /**
   * Returns the full dashboard analytics payload (KPIs + graph panels) —
   * the same computed from the dashboard page's entity sets: kpis,
   * executionLoad, workHealth, knowledgePipeline, goalMomentum,
   * relationshipRisk, heatmap (year activity graph), contextNetwork.
   */
  async getAnalytics(
    userId: string,
    options?: ServiceOptions,
  ): Promise<DashboardAnalytics> {
    const supabase = options?.supabase ?? createClient();

    // Resolve the user's timezone so "today" KPIs, capturedToday, and the
    // heatmap align to their calendar date — not server UTC.
    const prefs = await userSettingsService
      .getPreferences(userId, { supabase })
      .catch(() => null);
    const timeZone = prefs?.timezone;

    // Same entity fetch set as the dashboard page prefetch. allSettled so a
    // single failing source degrades to empty arrays instead of failing the
    // whole analytics payload.
    const [areas, goals, projects, tasks, notes, resources, topics, contacts] =
      await Promise.allSettled([
        serverFetchAreas(supabase, userId),
        serverFetchGoals(supabase, userId, { status: "all" }),
        serverFetchProjects(supabase, userId, { status: "all" }),
        serverFetchTasks(supabase, userId),
        serverFetchNotes(supabase, userId, { includeArchived: true }),
        serverFetchResources(supabase, userId),
        serverFetchTopics(supabase, userId),
        serverFetchContacts(supabase, userId),
      ]);

    return buildDashboardAnalytics({
      timeZone,
      areas: areas.status === "fulfilled" ? (areas.value as never) : [],
      goals: goals.status === "fulfilled" ? (goals.value as never) : [],
      projects: projects.status === "fulfilled" ? (projects.value as never) : [],
      tasks: tasks.status === "fulfilled" ? (tasks.value as never) : [],
      notes: notes.status === "fulfilled" ? (notes.value as never) : [],
      resources: resources.status === "fulfilled" ? (resources.value as never) : [],
      topics: topics.status === "fulfilled" ? (topics.value as never) : [],
      contacts: contacts.status === "fulfilled" ? (contacts.value as never) : [],
    });
  },

  buildGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
  },
};