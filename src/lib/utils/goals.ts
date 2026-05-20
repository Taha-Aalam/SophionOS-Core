import type { Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";

export type GoalTermFilter = "all" | "short" | "mid" | "long";
export type GoalStatusFilter = "active" | "all" | "archived" | "completed" | "inactive";
export type GoalView = "active" | "completed" | "inactive" | "long" | "mid" | "short";

export interface GoalViewFilters {
  status: GoalStatusFilter;
  term: GoalTermFilter;
}

export interface GoalListFilters {
  term?: GoalTermFilter;
  priority?: string;
  areaId?: string;
  status?: GoalStatusFilter;
}

type GoalWithAreaLinks = Pick<Goal, "area_id"> & { linkedAreaIds?: string[] };

const GOAL_VIEW_FILTERS: Record<GoalView, GoalViewFilters> = {
  active: {
    status: "active",
    term: "all",
  },
  short: {
    status: "active",
    term: "short",
  },
  mid: {
    status: "active",
    term: "mid",
  },
  long: {
    status: "active",
    term: "long",
  },
  inactive: {
    status: "inactive",
    term: "all",
  },
  completed: {
    status: "completed",
    term: "all",
  },
};

export function normalizeGoalStatusFilter(status: GoalStatusFilter): GoalStatusFilter {
  if (status === "archived") {
    return "inactive";
  }

  return status;
}

export function isInactiveGoalStatus(status: GoalStatusFilter): boolean {
  return normalizeGoalStatusFilter(status) === "inactive";
}

export function getGoalFiltersForView(view: GoalView): GoalViewFilters {
  return GOAL_VIEW_FILTERS[view];
}

export function getGoalViewFromFilters(filters: GoalViewFilters): GoalView {
  const normalizedStatus = normalizeGoalStatusFilter(filters.status);

  if (normalizedStatus === "completed") {
    return "completed";
  }

  if (normalizedStatus === "inactive") {
    return "inactive";
  }

  if (filters.term === "short") {
    return "short";
  }

  if (filters.term === "mid") {
    return "mid";
  }

  if (filters.term === "long") {
    return "long";
  }

  return "active";
}

export function getGoalLinkedAreaIds(goal: GoalWithAreaLinks): string[] {
  const linkedAreaIds = goal.linkedAreaIds ?? [];
  const nextAreaIds = goal.area_id ? [goal.area_id, ...linkedAreaIds] : linkedAreaIds;

  return Array.from(new Set(nextAreaIds.filter(Boolean)));
}

export function goalMatchesAreaId(goal: GoalWithAreaLinks, areaId?: string): boolean {
  if (!areaId) {
    return true;
  }

  return getGoalLinkedAreaIds(goal).includes(areaId);
}

export function goalMatchesFilters(
  goal: Goal,
  filters: GoalListFilters = {},
): boolean {
  const normalizedStatus = normalizeGoalStatusFilter(filters.status ?? "all");

  if (normalizedStatus === "active" && (goal.is_completed || goal.is_archived)) {
    return false;
  }

  if (normalizedStatus === "completed" && (!goal.is_completed || goal.is_archived)) {
    return false;
  }

  if (normalizedStatus === "inactive" && !goal.is_archived) {
    return false;
  }

  if (filters.term && filters.term !== "all" && goal.term !== filters.term) {
    return false;
  }

  if (filters.priority && filters.priority !== "all" && goal.priority !== filters.priority) {
    return false;
  }

  if (!goalMatchesAreaId(goal, filters.areaId)) {
    return false;
  }

  return true;
}

export function mergeGoalIntoFilteredList(
  goals: Goal[],
  goal: Goal,
  filters: GoalListFilters = {},
): Goal[] {
  const withoutGoal = goals.filter((currentGoal) => currentGoal.id !== goal.id);

  if (!goalMatchesFilters(goal, filters)) {
    return withoutGoal;
  }

  return [...withoutGoal, goal].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function calculateGoalProgress(
  goal: Pick<Goal, "is_completed" | "progress">,
  projects: Array<Pick<Project, "is_archived" | "status" | "progress">> = [],
  tasks: Array<Pick<Task, "is_archived" | "is_completed">> = [],
  notes: Array<Pick<Note, "is_archived" | "status">> = [],
  resources: Array<Pick<Resource, "is_archived" | "status">> = [],
): number {
  if (goal.is_completed) return 100;

  const activeProjects = projects.filter((p) => !p.is_archived);
  const activeTasks = tasks.filter((t) => !t.is_archived);
  const activeNotes = notes.filter((n) => !n.is_archived && n.status !== "archive");
  const activeResources = resources.filter((r) => !r.is_archived);

  const total =
    activeProjects.length + activeTasks.length + activeNotes.length + activeResources.length;

  if (total === 0) return goal.progress;

  const completed =
    activeProjects.reduce((sum, p) => sum + (p.progress ?? 0) / 100, 0) +
    activeTasks.filter((t) => t.is_completed).length +
    activeNotes.filter((n) => n.status === "saved").length +
    activeResources.filter((r) => r.status === "saved").length;

  return Math.round((completed / total) * 100);
}
