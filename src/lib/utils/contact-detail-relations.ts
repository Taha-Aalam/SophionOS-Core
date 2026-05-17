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
  count: number;
}

// ── Areas ─────────────────────────────────────────────────────────────

export function buildAreaTabs(areas: Area[]): TabOption[] {
  return [
    { value: "all", label: "All", count: areas.length },
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
    case "archived":
      return areas.filter((a) => a.archive);
    default:
      return areas;
  }
}

// ── Goals ─────────────────────────────────────────────────────────────

export function buildGoalTabs(goals: Goal[]): TabOption[] {
  return [
    {
      value: "active",
      label: "Active",
      count: goals.filter((g) => !g.is_completed && !g.is_archived).length,
    },
    {
      value: "short",
      label: "Short Term",
      count: goals.filter(
        (g) => g.term === "short" && !g.is_completed && !g.is_archived,
      ).length,
    },
    {
      value: "mid",
      label: "Mid Term",
      count: goals.filter(
        (g) => g.term === "mid" && !g.is_completed && !g.is_archived,
      ).length,
    },
    {
      value: "long",
      label: "Long Term",
      count: goals.filter(
        (g) => g.term === "long" && !g.is_completed && !g.is_archived,
      ).length,
    },
    {
      value: "inactive",
      label: "Inactive",
      count: goals.filter((g) => g.is_archived).length,
    },
    {
      value: "completed",
      label: "Completed",
      count: goals.filter((g) => g.is_completed && !g.is_archived).length,
    },
  ];
}

export function filterGoalsByTab(goals: Goal[], tab: string): Goal[] {
  switch (tab) {
    case "active":
      return goals.filter((g) => !g.is_completed && !g.is_archived);
    case "short":
      return goals.filter(
        (g) => g.term === "short" && !g.is_completed && !g.is_archived,
      );
    case "mid":
      return goals.filter(
        (g) => g.term === "mid" && !g.is_completed && !g.is_archived,
      );
    case "long":
      return goals.filter(
        (g) => g.term === "long" && !g.is_completed && !g.is_archived,
      );
    case "inactive":
      return goals.filter((g) => g.is_archived);
    case "completed":
      return goals.filter((g) => g.is_completed && !g.is_archived);
    default:
      return goals.filter((g) => !g.is_completed && !g.is_archived);
  }
}

// ── Projects ──────────────────────────────────────────────────────────

export function buildProjectTabs(projects: Project[]): TabOption[] {
  return [
    { value: "all", label: "All", count: projects.length },
    {
      value: "planning",
      label: "Planning",
      count: projects.filter((p) => p.status === "planning").length,
    },
    {
      value: "in_progress",
      label: "In Progress",
      count: projects.filter((p) => p.status === "active" && !p.is_archived)
        .length,
    },
    {
      value: "completed",
      label: "Completed",
      count: projects.filter((p) => p.status === "completed" && !p.is_archived)
        .length,
    },
    {
      value: "archived",
      label: "Archive",
      count: projects.filter((p) => p.is_archived).length,
    },
  ];
}

export function filterProjectsByTab(projects: Project[], tab: string): Project[] {
  switch (tab) {
    case "planning":
      return projects.filter((p) => p.status === "planning" && !p.is_archived);
    case "in_progress":
      return projects.filter((p) => p.status === "active" && !p.is_archived);
    case "completed":
      return projects.filter(
        (p) => p.status === "completed" && !p.is_archived,
      );
    case "archived":
      return projects.filter((p) => p.is_archived);
    default:
      return projects;
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────

export function buildTaskTabs(tasks: Task[]): TabOption[] {
  return [
    { value: "all", label: "All", count: tasks.length },
    {
      value: "inbox",
      label: "Inbox",
      count: tasks.filter((t) => t.status === "inbox" && !t.is_completed)
        .length,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: tasks.filter(
        (t) =>
          t.status !== "inbox" &&
          t.status !== "completed" &&
          !t.is_completed,
      ).length,
    },
    {
      value: "overdue",
      label: "Overdue",
      count: tasks.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      }).length,
    },
    {
      value: "completed",
      label: "Completed",
      count: tasks.filter((t) => t.is_completed).length,
    },
  ];
}

export function filterTasksByTab(tasks: Task[], tab: string): Task[] {
  switch (tab) {
    case "inbox":
      return tasks.filter((t) => t.status === "inbox" && !t.is_completed);
    case "upcoming":
      return tasks.filter(
        (t) =>
          t.status !== "inbox" &&
          t.status !== "completed" &&
          !t.is_completed,
      );
    case "overdue":
      return tasks.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      });
    case "completed":
      return tasks.filter((t) => t.is_completed);
    default:
      return tasks;
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
