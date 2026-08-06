import type { Area, Goal, Project, Task } from "@/lib/types/domain.types";
import { mergeProjectQueryResults } from "@/lib/utils/projects";

// ── Link type aliases (flat join rows from contact_* tables) ──────────

interface AreaLink {
  area_id: string;
}

interface GoalLink {
  goal_id: string;
}

interface ProjectLink {
  project_id: string;
}

interface TaskLink {
  task_id: string;
}

// ── Resolution helpers ────────────────────────────────────────────────

export function resolveLinkedAreas(
  links: AreaLink[],
  allAreas: Area[],
): Area[] {
  const ids = new Set(links.map((l) => l.area_id));
  return allAreas.filter((a) => ids.has(a.id));
}

export function resolveLinkedGoals(
  links: GoalLink[],
  allGoals: Goal[],
): Goal[] {
  const ids = new Set(links.map((l) => l.goal_id));
  return allGoals.filter((g) => ids.has(g.id));
}

export function resolveLinkedProjects(
  links: ProjectLink[],
  allProjects: Project[],
): Project[] {
  const ids = new Set(links.map((l) => l.project_id));
  return allProjects.filter((p) => ids.has(p.id));
}

export function resolveLinkedProjectsAcrossStatuses(
  links: ProjectLink[],
  activeProjects: Project[],
  archivedProjects: Project[],
): Project[] {
  return resolveLinkedProjects(
    links,
    mergeProjectQueryResults(activeProjects, archivedProjects),
  );
}

export function resolveLinkedTasks(
  links: TaskLink[],
  allTasks: Task[],
): Task[] {
  const ids = new Set(links.map((l) => l.task_id));
  return allTasks.filter((t) => ids.has(t.id));
}

// ── Tab option type ───────────────────────────────────────────────────

export interface TabOption {
  value: string;
  label: string;
  count?: number;
}

// ── Areas ─────────────────────────────────────────────────────────────

export function buildAreaTabs(areas: Area[]): TabOption[] {
  return [
    {
      value: "active",
      label: "Active",
      count: areas.filter((a) => !a.inactive && !a.archive).length,
    },
    {
      value: "inactive",
      label: "Inactive",
      count: areas.filter((a) => a.inactive && !a.archive).length,
    },
    { value: "by_type", label: "By type" },
    { value: "all", label: "All", count: areas.length },
    {
      value: "archived",
      label: "Archive",
      count: areas.filter((a) => a.archive).length,
    },
  ];
}

export function filterAreasByTab(areas: Area[], tab: string): Area[] {
  switch (tab) {
    case "active":
      return areas.filter((a) => !a.inactive && !a.archive);
    case "inactive":
      return areas.filter((a) => a.inactive && !a.archive);
    case "by_type":
      return areas.filter((a) => !a.archive);
    case "archived":
      return areas.filter((a) => a.archive);
    default:
      return areas;
  }
}

// ── Goals ─────────────────────────────────────────────────────────────

function isGoalAutoInactive(goal: Goal): boolean {
  // Auto-inactive only when rollup counts are hydrated AND all are zero. If any
  // rollup is undefined, treat the goal as not auto-inactive (caller may not
  // have hydrated counts in this view).
  const rollupsHydrated =
    goal.projectCount !== undefined ||
    goal.taskCount !== undefined ||
    goal.noteCount !== undefined ||
    goal.resourceCount !== undefined;
  if (!rollupsHydrated) return false;
  return (
    !goal.is_archived &&
    !goal.is_completed &&
    (goal.projectCount ?? 0) === 0 &&
    (goal.taskCount ?? 0) === 0 &&
    (goal.noteCount ?? 0) === 0 &&
    (goal.resourceCount ?? 0) === 0
  );
}

export function buildGoalTabs(goals: Goal[]): TabOption[] {
  const isInactive = (g: Goal) => g.is_inactive || isGoalAutoInactive(g);
  return [
    {
      value: "active",
      label: "Active",
      count: goals.filter(
        (g) => !g.is_completed && !g.is_archived && !isInactive(g),
      ).length,
    },
    {
      value: "short",
      label: "Short Term",
      count: goals.filter(
        (g) =>
          g.term === "short" &&
          !g.is_completed &&
          !g.is_archived &&
          !isInactive(g),
      ).length,
    },
    {
      value: "mid",
      label: "Mid Term",
      count: goals.filter(
        (g) =>
          g.term === "mid" &&
          !g.is_completed &&
          !g.is_archived &&
          !isInactive(g),
      ).length,
    },
    {
      value: "long",
      label: "Long Term",
      count: goals.filter(
        (g) =>
          g.term === "long" &&
          !g.is_completed &&
          !g.is_archived &&
          !isInactive(g),
      ).length,
    },
    {
      value: "inactive",
      label: "Inactive",
      count: goals.filter((g) => isInactive(g) && !g.is_archived).length,
    },
    {
      value: "completed",
      label: "Completed",
      count: goals.filter((g) => g.is_completed && !g.is_archived).length,
    },
    {
      value: "archived",
      label: "Archived",
      count: goals.filter((g) => g.is_archived).length,
    },
  ];
}

export function filterGoalsByTab(goals: Goal[], tab: string): Goal[] {
  const isInactive = (g: Goal) => g.is_inactive || isGoalAutoInactive(g);
  switch (tab) {
    case "active":
      return goals.filter(
        (g) => !g.is_completed && !g.is_archived && !isInactive(g),
      );
    case "short":
      return goals.filter(
        (g) =>
          g.term === "short" &&
          !g.is_completed &&
          !g.is_archived &&
          !isInactive(g),
      );
    case "mid":
      return goals.filter(
        (g) =>
          g.term === "mid" &&
          !g.is_completed &&
          !g.is_archived &&
          !isInactive(g),
      );
    case "long":
      return goals.filter(
        (g) =>
          g.term === "long" &&
          !g.is_completed &&
          !g.is_archived &&
          !isInactive(g),
      );
    case "inactive":
      return goals.filter((g) => isInactive(g) && !g.is_archived);
    case "completed":
      return goals.filter((g) => g.is_completed && !g.is_archived);
    case "archived":
      return goals.filter((g) => g.is_archived);
    default:
      return goals.filter(
        (g) => !g.is_completed && !g.is_archived && !isInactive(g),
      );
  }
}

// ── Projects ──────────────────────────────────────────────────────────

export function buildProjectTabs(projects: Project[]): TabOption[] {
  const nonArchived = projects.filter((p) => !p.is_archived);
  return [
    { value: "all", label: "All", count: nonArchived.length },
    {
      value: "inbox",
      label: "Inbox",
      count: nonArchived.filter((p) => p.status === "inbox").length,
    },
    {
      value: "planning",
      label: "Planning",
      count: nonArchived.filter((p) => p.status === "planning").length,
    },
    {
      value: "in_progress",
      label: "In Progress",
      count: nonArchived.filter((p) => p.status === "active").length,
    },
    {
      value: "on_hold",
      label: "On Hold",
      count: nonArchived.filter((p) => p.status === "on_hold").length,
    },
    {
      value: "completed",
      label: "Completed",
      count: nonArchived.filter((p) => p.status === "completed").length,
    },
    {
      value: "archived",
      label: "Archived",
      count: projects.filter((p) => p.is_archived).length,
    },
  ];
}

export function filterProjectsByTab(projects: Project[], tab: string): Project[] {
  switch (tab) {
    case "inbox":
      return projects.filter((p) => p.status === "inbox" && !p.is_archived);
    case "planning":
      return projects.filter((p) => p.status === "planning" && !p.is_archived);
    case "in_progress":
      return projects.filter((p) => p.status === "active" && !p.is_archived);
    case "on_hold":
      return projects.filter((p) => p.status === "on_hold" && !p.is_archived);
    case "completed":
      return projects.filter(
        (p) => p.status === "completed" && !p.is_archived,
      );
    case "archived":
      return projects.filter((p) => p.is_archived);
    default:
      return projects.filter((p) => !p.is_archived);
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────

export function buildTaskTabs(tasks: Task[] = []): TabOption[] {
  const activeTasks = tasks.filter((t) => !t.is_archived);
  const archivedCount = tasks.filter((t) => t.is_archived).length;
  return [
    { value: "all", label: "All", count: activeTasks.length },
    {
      value: "inbox",
      label: "Inbox",
      count: activeTasks.filter((t) => t.status === "inbox" && !t.is_completed).length,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: activeTasks.filter(
        (t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed,
      ).length,
    },
    {
      value: "overdue",
      label: "Overdue",
      count: activeTasks.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      }).length,
    },
    { value: "by_area", label: "By Area" },
    { value: "by_goal", label: "By Goal" },
    { value: "by_project", label: "By Project" },
    {
      value: "completed",
      label: "Completed",
      count: activeTasks.filter((t) => t.is_completed).length,
    },
    { value: "archived", label: "Archived", count: archivedCount },
  ];
}

export function filterTasksByTab(tasks: Task[], tab: string): Task[] {
  if (tab === "archived") return tasks.filter((t) => t.is_archived);
  const active = tasks.filter((t) => !t.is_archived);
  switch (tab) {
    case "inbox":
      return active.filter((t) => t.status === "inbox" && !t.is_completed);
    case "upcoming":
      return active.filter(
        (t) =>
          t.status !== "inbox" &&
          t.status !== "completed" &&
          !t.is_completed,
      );
    case "overdue":
      return active.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      });
    case "completed":
      return active.filter((t) => t.is_completed);
    case "by_area":
    case "by_goal":
    case "by_project":
      return active;
    default:
      return active;
  }
}

// ── Area name/icon resolution for entity badges ───────────────────────

export function buildAreaLookup(areas: Area[]): Map<string, Area> {
  return new Map(areas.map((a) => [a.id, a]));
}

export function getAreaNamesForEntity(
  entityAreaIds: string[],
  areaLookup: Map<string, Area>,
): string[] {
  return entityAreaIds
    .map((id) => areaLookup.get(id)?.name)
    .filter((n): n is string => Boolean(n));
}

export function getAreaIconsForEntity(
  entityAreaIds: string[],
  areaLookup: Map<string, Area>,
): (string | null)[] {
  return entityAreaIds.map((id) => areaLookup.get(id)?.icon ?? null);
}
