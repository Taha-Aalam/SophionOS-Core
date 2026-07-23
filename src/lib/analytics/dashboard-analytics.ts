import type { Area, Contact, Goal, Note, Project, Resource, Task, Topic } from "@/lib/types/domain.types";
import { NOTE_STATUS, PROJECT_STATUS, RESOURCE_STATUS, TASK_STATUS } from "@/lib/utils/constants";

export type GoalProgressBucket = "stuck" | "moving" | "almostDone";

export interface DashboardAnalyticsInput {
  now?: Date;
  areas: Area[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  topics: Topic[];
  contacts: Contact[];
}

export interface DashboardAnalytics {
  kpis: {
    focusTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
    activeGoals: number;
  };
  executionLoad: {
    today: number;
    overdue: number;
    focus: number;
    inProgress: number;
    completedThisWeek: number;
  };
  workHealth: {
    overdueByArea: Array<{ id: string; name: string; count: number }>;
    overdueByProject: Array<{ id: string; name: string; count: number }>;
    stalledProjects: Array<{ id: string; name: string; daysSinceUpdate: number }>;
    lowProgressNearDueGoals: Array<{ id: string; name: string; progress: number; daysUntilDue: number }>;
    unassignedTasks: number;
  };
  knowledgePipeline: {
    capturedToday: number;
    waitingReview: number;
    saved: number;
    archived: number;
    backlog: number;
    mostActiveTopics: Array<{ id: string; name: string; count: number }>;
  };
  goalMomentum: {
    movingGoals: number;
    stalledGoals: number;
    buckets: Record<GoalProgressBucket, number>;
  };
  relationshipRisk: {
    followUpsDue: number;
    tiedToActiveProjects: number;
    contacts: Array<{ id: string; name: string; daysOverdue: number; activeProjectCount: number }>;
  };
  heatmap: {
    days: Array<{ date: string; completed: number; captured: number; total: number }>;
  };
  contextNetwork: {
    areaNodes: number;
    goalNodes: number;
    projectNodes: number;
    taskNodes: number;
    links: Array<{ source: string; target: string; value: number }>;
    densityScore: number;
  };
}

const MS_PER_DAY = 86_400_000;
const DEFAULT_STALLED_DAYS = 21;
const DEFAULT_NEAR_DUE_DAYS = 14;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local calendar date key (YYYY-MM-DD) — consistent with startOfDay. */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

/**
 * Parse timestamps and calendar dates. Date-only `YYYY-MM-DD` uses local
 * midnight (same as tasks.ts `parseDateOnly`) so due_date / target_date do not
 * shift a day west of UTC. Full ISO instants use `new Date`.
 */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const local = new Date(year, month - 1, day);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function entityName(entity: { name?: string | null; title?: string | null }): string {
  return entity.name ?? entity.title ?? "Untitled";
}

function isTaskCompleted(task: Task): boolean {
  return Boolean(task.is_completed || task.completed_at || task.status === TASK_STATUS.COMPLETED);
}

function isTaskActive(task: Task): boolean {
  return !task.is_archived && !isTaskCompleted(task) && task.status !== TASK_STATUS.ARCHIVED;
}

function isDueToday(task: Task, now: Date): boolean {
  const due = parseDate(task.due_date);
  return Boolean(due && toDateKey(due) === toDateKey(now));
}

function isOverdue(task: Task, now: Date): boolean {
  const due = parseDate(task.due_date);
  return Boolean(due && startOfDay(due) < startOfDay(now) && isTaskActive(task));
}

function isCompletedThisWeek(task: Task, now: Date): boolean {
  const completed = parseDate(task.completed_at ?? task.updated_at);
  if (!completed || !isTaskCompleted(task)) return false;
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return completed >= weekStart && completed <= now;
}

function activeGoals(goals: Goal[]): Goal[] {
  return goals.filter((goal) => !goal.is_completed && !goal.is_archived);
}

function activeProjects(projects: Project[]): Project[] {
  return projects.filter(
    (project) =>
      !project.is_archived &&
      project.status !== PROJECT_STATUS.COMPLETED &&
      project.status !== PROJECT_STATUS.ARCHIVED,
  );
}

function linkedAreaIds(entity: { area_id?: string | null; linkedAreaIds?: string[] }): string[] {
  return entity.linkedAreaIds?.length ? entity.linkedAreaIds : entity.area_id ? [entity.area_id] : [];
}

function linkedProjectIds(entity: {
  project_id?: string | null;
  linkedProjectIds?: string[];
}): string[] {
  return entity.linkedProjectIds?.length
    ? entity.linkedProjectIds
    : entity.project_id
      ? [entity.project_id]
      : [];
}

function linkedGoalIds(entity: { goal_id?: string | null; linkedGoalIds?: string[] }): string[] {
  return entity.linkedGoalIds?.length ? entity.linkedGoalIds : entity.goal_id ? [entity.goal_id] : [];
}

export function getGoalProgressBucket(goal: Goal, now: Date): GoalProgressBucket {
  const progress = Number(goal.progress ?? 0);
  const due = parseDate(goal.target_date);
  const nearDue = due ? daysBetween(due, now) <= DEFAULT_NEAR_DUE_DAYS : false;
  if (progress >= 75) return "almostDone";
  if (progress < 25 || (nearDue && progress < 50)) return "stuck";
  return "moving";
}

export function buildDashboardAnalytics(input: DashboardAnalyticsInput): DashboardAnalytics {
  const now = input.now ?? new Date();
  const areasById = new Map(input.areas.map((area) => [area.id, entityName(area)]));
  const projectsById = new Map(input.projects.map((project) => [project.id, entityName(project)]));
  const topicsById = new Map(input.topics.map((topic) => [topic.id, entityName(topic)]));
  const activeGoalRows = activeGoals(input.goals);
  const activeProjectRows = activeProjects(input.projects);
  const activeProjectIds = new Set(activeProjectRows.map((project) => project.id));
  const overdueTasks = input.tasks.filter((task) => isOverdue(task, now));
  const completedThisWeek = input.tasks.filter((task) => isCompletedThisWeek(task, now)).length;
  const focusTasks = input.tasks.filter((task) => isTaskActive(task) && task.is_focused).length;
  const todayTasks = input.tasks.filter((task) => isTaskActive(task) && isDueToday(task, now)).length;
  const inProgress = input.tasks.filter(
    (task) => isTaskActive(task) && task.status === TASK_STATUS.IN_PROGRESS,
  ).length;

  const overdueByArea = countNamedGroups(overdueTasks.flatMap(linkedAreaIds), areasById);
  const overdueByProject = countNamedGroups(overdueTasks.flatMap(linkedProjectIds), projectsById);

  const stalledProjects = activeProjectRows
    .map((project) => ({
      id: project.id,
      name: entityName(project),
      daysSinceUpdate: daysBetween(now, parseDate(project.updated_at) ?? now),
    }))
    .filter((project) => project.daysSinceUpdate >= DEFAULT_STALLED_DAYS)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .slice(0, 5);

  const lowProgressNearDueGoals = activeGoalRows
    .map((goal) => {
      const due = parseDate(goal.target_date);
      return {
        id: goal.id,
        name: entityName(goal),
        progress: Number(goal.progress ?? 0),
        daysUntilDue: due ? daysBetween(due, now) : Number.POSITIVE_INFINITY,
      };
    })
    .filter(
      (goal) =>
        goal.daysUntilDue >= 0 && goal.daysUntilDue <= DEFAULT_NEAR_DUE_DAYS && goal.progress < 50,
    )
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 5);

  const unassignedTasks = input.tasks.filter((task) => {
    return (
      isTaskActive(task) &&
      linkedAreaIds(task).length === 0 &&
      linkedProjectIds(task).length === 0 &&
      linkedGoalIds(task).length === 0
    );
  }).length;

  const notesWaiting = input.notes.filter(
    (note) =>
      !note.is_archived &&
      [NOTE_STATUS.INBOX, NOTE_STATUS.TO_REVIEW].includes(note.status as never),
  ).length;
  const resourcesWaiting = input.resources.filter(
    (resource) =>
      !resource.is_archived &&
      [RESOURCE_STATUS.INBOX, RESOURCE_STATUS.TO_REVIEW].includes(resource.status as never),
  ).length;
  const saved =
    input.notes.filter((note) => note.status === NOTE_STATUS.COMPLETED).length +
    input.resources.filter((resource) => resource.status === RESOURCE_STATUS.COMPLETED).length;
  const archived =
    input.notes.filter((note) => note.is_archived || note.status === NOTE_STATUS.ARCHIVE).length +
    input.resources.filter((resource) => resource.is_archived).length;
  const capturedToday = [...input.notes, ...input.resources].filter((item) => {
    const created = parseDate(item.created_at);
    return Boolean(created && toDateKey(created) === toDateKey(now));
  }).length;

  const topicCounts = new Map<string, number>();
  for (const note of input.notes)
    if (note.topic_id) topicCounts.set(note.topic_id, (topicCounts.get(note.topic_id) ?? 0) + 1);
  for (const resource of input.resources)
    if (resource.topic_id)
      topicCounts.set(resource.topic_id, (topicCounts.get(resource.topic_id) ?? 0) + 1);

  const buckets: Record<GoalProgressBucket, number> = { stuck: 0, moving: 0, almostDone: 0 };
  for (const goal of activeGoalRows) buckets[getGoalProgressBucket(goal, now)] += 1;

  const relationshipContacts = input.contacts
    .filter((contact) => !contact.archive && contact.follow_up_interval_days)
    .map((contact) => {
      const interval = Number(contact.follow_up_interval_days ?? 0);
      // Prefer last interaction; fall back to created_at so null interaction
      // never yields Infinity days overdue in the UI.
      const anchor =
        parseDate(contact.last_interaction_at) ?? parseDate(contact.created_at) ?? null;
      // No known anchor → treat as exactly at the interval (due, 0 days overdue).
      const daysSinceInteraction = anchor ? daysBetween(now, anchor) : interval;
      const daysOverdue = Math.floor(daysSinceInteraction - interval);
      const projectIds = linkedProjectIds(contact);
      return {
        id: contact.id,
        name: entityName(contact),
        daysOverdue,
        activeProjectCount: projectIds.filter((id) => activeProjectIds.has(id)).length,
      };
    })
    .filter((contact) => Number.isFinite(contact.daysOverdue) && contact.daysOverdue >= 0)
    .sort((a, b) => b.activeProjectCount - a.activeProjectCount || b.daysOverdue - a.daysOverdue)
    .slice(0, 5);

  return {
    kpis: {
      focusTasks,
      overdueTasks: overdueTasks.length,
      completedThisWeek,
      activeGoals: activeGoalRows.length,
    },
    executionLoad: {
      today: todayTasks,
      overdue: overdueTasks.length,
      focus: focusTasks,
      inProgress,
      completedThisWeek,
    },
    workHealth: {
      overdueByArea,
      overdueByProject,
      stalledProjects,
      lowProgressNearDueGoals,
      unassignedTasks,
    },
    knowledgePipeline: {
      capturedToday,
      waitingReview: notesWaiting + resourcesWaiting,
      saved,
      archived,
      backlog: notesWaiting + resourcesWaiting,
      mostActiveTopics: Array.from(topicCounts.entries())
        .map(([id, count]) => ({ id, name: topicsById.get(id) ?? "Unknown topic", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    goalMomentum: {
      movingGoals: buckets.moving + buckets.almostDone,
      stalledGoals: buckets.stuck,
      buckets,
    },
    relationshipRisk: {
      followUpsDue: relationshipContacts.length,
      tiedToActiveProjects: relationshipContacts.filter((contact) => contact.activeProjectCount > 0)
        .length,
      contacts: relationshipContacts,
    },
    heatmap: buildHeatmap(input.tasks, input.notes, input.resources, now),
    contextNetwork: buildContextNetwork(input.areas, activeGoalRows, activeProjectRows, input.tasks),
  };
}

function countNamedGroups(
  ids: string[],
  names: Map<string, string>,
): Array<{ id: string; name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, name: names.get(id) ?? "Unassigned", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * GitHub-style contribution window: from the Monday on/before (today − 1 year)
 * through today, so the grid fills complete weeks (~53 columns).
 */
export function buildHeatmapDateRange(now: Date): { start: Date; end: Date } {
  const end = startOfDay(now);
  const start = startOfDay(now);
  start.setFullYear(start.getFullYear() - 1);
  const jsDay = start.getDay();
  const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
  start.setDate(start.getDate() - mondayIndex);
  return { start, end };
}

function buildHeatmap(
  tasks: Task[],
  notes: Note[],
  resources: Resource[],
  now: Date,
): DashboardAnalytics["heatmap"] {
  const { start, end } = buildHeatmapDateRange(now);
  const days: DashboardAnalytics["heatmap"]["days"] = [];
  for (
    let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    cursor.getTime() <= end.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    days.push({
      date: toDateKey(cursor),
      completed: 0,
      captured: 0,
      total: 0,
    });
  }
  const dayMap = new Map(days.map((day) => [day.date, day]));

  for (const task of tasks) {
    if (!isTaskCompleted(task)) continue;
    const date = parseDate(task.completed_at ?? task.updated_at);
    const day = date ? dayMap.get(toDateKey(date)) : undefined;
    if (day) day.completed += 1;
  }
  for (const item of [...notes, ...resources]) {
    const date = parseDate(item.created_at);
    const day = date ? dayMap.get(toDateKey(date)) : undefined;
    if (day) day.captured += 1;
  }
  for (const day of days) day.total = day.completed + day.captured;

  return { days };
}

function buildContextNetwork(
  areas: Area[],
  goals: Goal[],
  projects: Project[],
  tasks: Task[],
): DashboardAnalytics["contextNetwork"] {
  // UI only needs node counts + densityScore. Count edges without allocating
  // a full link graph (large task lists used to materialize thousands of objects).
  let linkCount = 0;
  for (const goal of goals) linkCount += linkedAreaIds(goal).length;
  for (const project of projects) {
    linkCount += linkedGoalIds(project).length;
    linkCount += linkedAreaIds(project).length;
  }
  const activeTasks = tasks.filter(isTaskActive);
  for (const task of activeTasks) {
    linkCount += linkedProjectIds(task).length;
    linkCount += linkedGoalIds(task).length;
    linkCount += linkedAreaIds(task).length;
  }

  const possibleLinks = Math.max(1, goals.length + projects.length + activeTasks.length);
  return {
    areaNodes: areas.filter((area) => !area.archive).length,
    goalNodes: goals.length,
    projectNodes: projects.length,
    taskNodes: activeTasks.length,
    links: [],
    densityScore: Math.round(Math.min(100, (linkCount / possibleLinks) * 100)),
  };
}
