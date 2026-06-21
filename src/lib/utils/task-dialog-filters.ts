// src/lib/utils/task-dialog-filters.ts
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";

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
      // Unassigned (no area_id, no linkedAreaIds) projects stay visible
      // alongside area-scoped ones — the user might still want to attach them.
      if (projectAreas.length === 0) return true;
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

  const candidates = goals.filter((goal) => {
    if (projectConstraintActive && !projectGoalSet.has(goal.id)) return false;

    if (hasAreas) {
      // Unassigned (no area_id, no linkedAreaIds) goals stay visible
      // alongside area-scoped ones — the user might still want to link them.
      const goalAreaIds = getGoalLinkedAreaIds(goal);
      if (goalAreaIds.length === 0) return true;
      if (!selectedAreaIds.some((aId) => goalAreaIds.includes(aId))) return false;
    }

    return true;
  });
  // Fallback: when the intersection collapses to empty, surface the full
  // goal list so the user can still link a goal.
  if (candidates.length === 0) return goals;
  return candidates;
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

// ── Multi-project variants ──────────────────────────────────────────────────
//
// Tasks support being linked to multiple projects. The cross-field cascade
// uses *union* semantics: a goal/area is allowed as long as at least one of
// the selected projects supports it. Otherwise, picking two unrelated
// projects would collapse the goal/area selector to empty even though the
// user could legitimately link the task to either chain.

/**
 * Returns goals satisfying ALL active constraints (AND-intersection across
 * dimensions, but UNION across selected projects):
 *   - any selected project allows the goal (when the project has linkedGoalIds)
 *   - the goal is in any selected area
 */
export function computeVisibleGoalsForProjects<T extends FilterableGoal>(
  goals: T[],
  selectedProjectIds: string[],
  selectedAreaIds: string[],
  projectById: Map<string, FilterableProject>,
): T[] {
  const hasProjects = selectedProjectIds.length > 0;
  const hasAreas = selectedAreaIds.length > 0;

  if (!hasProjects && !hasAreas) return goals;

  // Build the goal-id allow-set across all selected projects. If any
  // selected project has no `linkedGoalIds`, that project imposes no
  // goal constraint, so the union is unrestricted.
  let projectGoalSet: Set<string> | null = null;
  let projectConstraintActive = false;
  if (hasProjects) {
    projectConstraintActive = true;
    projectGoalSet = new Set();
    for (const projectId of selectedProjectIds) {
      const proj = projectById.get(projectId);
      const linked = proj?.linkedGoalIds ?? [];
      if (linked.length === 0) {
        // This project has no recorded goal links → no constraint.
        projectConstraintActive = false;
        break;
      }
      for (const id of linked) projectGoalSet.add(id);
    }
  }

  return goals.filter((goal) => {
    if (projectConstraintActive && projectGoalSet && !projectGoalSet.has(goal.id)) return false;
    if (hasAreas) {
      // Unassigned goals stay visible alongside area-scoped ones.
      const goalAreaIds = getGoalLinkedAreaIds(goal);
      if (goalAreaIds.length === 0) return true;
      if (!selectedAreaIds.some((aId) => goalAreaIds.includes(aId))) return false;
    }
    return true;
  });
}

/**
 * Returns areas satisfying ALL active constraints (AND-intersection across
 * dimensions, but UNION across selected projects/goals).
 */
export function computeVisibleAreasForProjects<T extends FilterableArea>(
  areas: T[],
  selectedGoalIds: string[],
  selectedProjectIds: string[],
  projectById: Map<string, FilterableProject>,
  goals: FilterableGoal[],
): T[] {
  const hasGoals = selectedGoalIds.length > 0;
  const hasProjects = selectedProjectIds.length > 0;

  if (!hasGoals && !hasProjects) return areas;

  let allowed: Set<string> | null = null;

  if (hasProjects) {
    const projectAreaSet = new Set<string>();
    for (const projectId of selectedProjectIds) {
      const proj = projectById.get(projectId);
      if (!proj) continue;
      const projAreas = [proj.area_id, ...(proj.linkedAreaIds ?? [])].filter(
        (id): id is string => Boolean(id),
      );
      for (const id of projAreas) projectAreaSet.add(id);
    }
    allowed = projectAreaSet;
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
