export type GoalTermFilter = "all" | "short" | "mid" | "long";
export type GoalStatusFilter = "active" | "all" | "archived" | "completed" | "inactive";
export type GoalView = "active" | "completed" | "inactive" | "long" | "mid" | "short";

export interface GoalViewFilters {
  status: GoalStatusFilter;
  term: GoalTermFilter;
}

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
