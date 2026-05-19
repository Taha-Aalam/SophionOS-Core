// src/lib/utils/task-dialog-filters.ts
import { goalMatchesAreaId } from "@/lib/utils/goals";

interface FilterableProject {
  id: string;
  area_id?: string | null;
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
}

interface FilterableGoal {
  id: string;
  area_id: string | null;
  linkedAreaIds?: string[];
}

/**
 * Returns projects satisfying ALL active constraints (AND-intersection):
 * - goal + area → linked to any selected goal AND in any selected area
 * - goal only  → linked to any selected goal
 * - area only  → area_id or linkedAreaIds overlaps selected areas
 * - neither    → all projects
 */
export function computeFilteredProjects<T extends FilterableProject>(
  projects: T[],
  selectedGoalIds: string[],
  selectedAreaIds: string[],
): T[] {
  const hasGoals = selectedGoalIds.length > 0;
  const hasAreas = selectedAreaIds.length > 0;

  if (!hasGoals && !hasAreas) return projects;

  const goalSet = new Set(selectedGoalIds);
  const areaSet = new Set(selectedAreaIds);

  return projects.filter((project) => {
    if (hasGoals) {
      const linked = project.linkedGoalIds ?? [];
      if (!linked.some((gId) => goalSet.has(gId))) return false;
    }

    if (hasAreas) {
      const projectAreas = [
        project.area_id,
        ...(project.linkedAreaIds ?? []),
      ].filter((id): id is string => Boolean(id));
      if (!projectAreas.some((aId) => areaSet.has(aId))) return false;
    }

    return true;
  });
}

/**
 * Returns goals satisfying ALL active constraints (AND-intersection):
 * - project + area → linked to project AND in any selected area
 * - project only  → linked to project (all goals when project has no linkedGoalIds)
 * - area only     → in any selected area
 * - neither       → all goals
 */
export function computeVisibleGoals<T extends FilterableGoal>(
  goals: T[],
  selectedProjectId: string | null | undefined,
  selectedAreaIds: string[],
  projectById: Map<string, FilterableProject>,
): T[] {
  const hasProject = Boolean(selectedProjectId);
  const hasAreas = selectedAreaIds.length > 0;

  if (!hasProject && !hasAreas) return goals;

  const proj = selectedProjectId ? projectById.get(selectedProjectId) : undefined;
  const projectGoalIds = proj?.linkedGoalIds ?? [];
  const projectGoalSet = new Set(projectGoalIds);
  const projectConstraintActive = hasProject && projectGoalIds.length > 0;

  return goals.filter((goal) => {
    if (projectConstraintActive && !projectGoalSet.has(goal.id)) return false;

    if (hasAreas && !selectedAreaIds.some((aId) => goalMatchesAreaId(goal, aId))) return false;

    return true;
  });
}

interface FilterableArea {
  id: string;
}

/**
 * Returns areas satisfying ALL active constraints (AND-intersection):
 * - goals   → union of all selected goals' linked areas
 * - project → project's area_id + linkedAreaIds
 * When both goals and project are active, areas must appear in BOTH sets.
 */
export function computeVisibleAreas<T extends FilterableArea>(
  areas: T[],
  selectedGoalIds: string[],
  selectedProjectId: string | null | undefined,
  projectById: Map<string, FilterableProject>,
  goals: FilterableGoal[],
): T[] {
  const hasGoals = selectedGoalIds.length > 0;
  const hasProject = Boolean(selectedProjectId);

  if (!hasGoals && !hasProject) return areas;

  let allowed: Set<string> | null = null;

  if (hasProject) {
    const proj = projectById.get(selectedProjectId!);
    if (proj) {
      const projAreas = [proj.area_id, ...(proj.linkedAreaIds ?? [])].filter(
        (id): id is string => Boolean(id),
      );
      allowed = new Set(projAreas);
    }
  }

  if (hasGoals) {
    const goalAreaSet = new Set<string>();
    for (const goalId of selectedGoalIds) {
      const goal = goals.find((g) => g.id === goalId);
      if (goal) {
        const aIds = [goal.area_id, ...(goal.linkedAreaIds ?? [])].filter(
          (id): id is string => Boolean(id),
        );
        for (const aId of aIds) goalAreaSet.add(aId);
      }
    }
    allowed = allowed
      ? new Set([...allowed].filter((id) => goalAreaSet.has(id)))
      : goalAreaSet;
  }

  if (allowed && allowed.size === 0) return [];
  return allowed ? areas.filter((a) => allowed!.has(a.id)) : areas;
}
