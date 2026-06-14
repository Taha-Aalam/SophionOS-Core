// src/lib/utils/resource-dialog-filters.ts
import { goalMatchesAreaId } from "@/lib/utils/goals";

interface FilterableArea {
  id: string;
}

interface FilterableProject {
  id: string;
  area_id?: string | null;
  linkedAreaIds?: string[];
}

interface FilterableGoal {
  id: string;
  area_id: string | null;
  linkedAreaIds?: string[];
}

interface FilterableTask {
  id: string;
  area_id?: string | null;
  linkedAreaIds?: string[];
  project_id?: string | null;
}

/** Get the set of area IDs that an entity is associated with. */
function getEntityAreaIds(entity: {
  area_id?: string | null;
  linkedAreaIds?: string[];
}): string[] {
  return [entity.area_id, ...(entity.linkedAreaIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );
}

/**
 * Returns areas satisfying ALL active constraints (AND-intersection):
 * - project → project's areas (area_id + linkedAreaIds)
 * - goals   → goals' areas
 * - tasks   → tasks' areas
 * When multiple are active, areas must match ALL of them.
 */
export function computeVisibleAreas<T extends FilterableArea>(
  areas: T[],
  selectedProject: FilterableProject | null | undefined,
  selectedGoals: FilterableGoal[],
  selectedTasks: FilterableTask[],
  preselectedAreaIds?: string[],
): T[] {
  const hasProject = Boolean(selectedProject);
  const hasGoals = selectedGoals.length > 0;
  const hasTasks = selectedTasks.length > 0;
  const preselected = new Set(preselectedAreaIds ?? []);

  if (!hasProject && !hasGoals && !hasTasks) return areas;

  // Build the set of allowed area IDs from each active constraint
  let allowed: Set<string> | null = null;

  if (hasProject) {
    const ids = getEntityAreaIds(selectedProject!);
    allowed = new Set(ids);
  }

  if (hasGoals) {
    const goalAreas = new Set(
      selectedGoals.flatMap((g) => getEntityAreaIds(g)),
    );
    allowed = allowed
      ? new Set([...allowed].filter((id) => goalAreas.has(id)))
      : goalAreas;
  }

  if (hasTasks) {
    const taskAreas = new Set(
      selectedTasks.flatMap((t) => getEntityAreaIds(t)),
    );
    allowed = allowed
      ? new Set([...allowed].filter((id) => taskAreas.has(id)))
      : taskAreas;
  }

  if (allowed && allowed.size === 0) {
    // No area satisfies the AND-intersection, but the resource may still
    // have preselected (e.g. existing junction-linked) areas. Keep those
    // visible so the user can keep or remove them on edit.
    if (preselected.size > 0) {
      return areas.filter((a) => preselected.has(a.id));
    }
    return [];
  }
  return allowed
    ? areas.filter((a) => preselected.has(a.id) || allowed!.has(a.id))
    : areas;
}

/**
 * Returns projects satisfying ALL active constraints (AND-intersection):
 * - areas       → project's area_id or linkedAreaIds overlaps selected areas
 * - goalIds     → project appears in goalProjectIdsMap for any selected goal
 * - taskProjectIds → project is the project_id of any selected task
 * When multiple are active, project must match ALL of them.
 */
export function computeFilteredProjects<T extends FilterableProject>(
  projects: T[],
  selectedAreaIds: string[],
  selectedGoalIds: string[],
  goalProjectIdsMap: Map<string, string[]>,
  selectedTasks?: FilterableTask[],
  preselectedProjectIds?: string[],
): T[] {
  const hasAreas = selectedAreaIds.length > 0;
  const hasGoals = selectedGoalIds.length > 0;
  const hasTasks = selectedTasks && selectedTasks.length > 0;
  const preselected = new Set(preselectedProjectIds ?? []);

  if (!hasAreas && !hasGoals && !hasTasks) return projects;

  const areaSet = new Set(selectedAreaIds);

  // Build set of project IDs allowed by tasks
  const taskProjectIds = hasTasks
    ? new Set(
        selectedTasks!.map((t) => t.project_id).filter(Boolean) as string[],
      )
    : null;

  // Build set of project IDs allowed by goals
  const goalProjectIds = hasGoals
    ? new Set(
        selectedGoalIds.flatMap((gId) => goalProjectIdsMap.get(gId) ?? []),
      )
    : null;

  return projects.filter((project) => {
    // Preselected projects (e.g. the resource's existing junction links
    // when editing) must always remain visible in the dropdown so the user
    // can keep or remove them, even if the cross-filter would otherwise
    // hide them. The clear-invalid effect relies on this to avoid
    // stripping valid links on open.
    if (preselected.has(project.id)) return true;

    const projectAreas = getEntityAreaIds(project);
    // Unassigned projects (no area_id, no linkedAreaIds) stay visible when an
    // area filter is active — the user can still attach them. When no area
    // filter is active, they must satisfy the goal/task constraints like any other.
    if (hasAreas && projectAreas.length === 0) return true;

    if (hasAreas) {
      if (!projectAreas.some((aId) => areaSet.has(aId))) return false;
    }

    if (hasGoals && goalProjectIds) {
      if (!goalProjectIds.has(project.id)) return false;
    }

    if (hasTasks && taskProjectIds) {
      if (!taskProjectIds.has(project.id)) return false;
    }

    return true;
  });
}

/**
 * Returns goals satisfying ALL active constraints (AND-intersection):
 * - areaIds          → goal's area_id or linkedAreaIds overlaps selected areas
 * - selectedProjectId → goal appears in projectGoalIdsMap for the selected project
 * - tasks            → goal appears in taskGoalIdsMap for any selected task,
 *                      OR in projectGoalIdsMap for any selected task's project
 * When multiple are active, goal must match ALL of them.
 */
export function computeFilteredGoals<T extends FilterableGoal>(
  goals: T[],
  selectedAreaIds: string[] | null | undefined,
  selectedProjectId: string | null | undefined,
  projectGoalIdsMap: Map<string, string[]>,
  taskGoalIdsMap?: Map<string, string[]>,
  selectedTasks?: FilterableTask[],
  preselectedGoalIds?: string[],
): T[] {
  const hasAreas = selectedAreaIds && selectedAreaIds.length > 0;
  const hasProject = Boolean(selectedProjectId);
  const hasTasks = selectedTasks && selectedTasks.length > 0;

  if (!hasAreas && !hasProject && !hasTasks) return goals;

  // Project constraint: goals linked to the project
  const projectGoalSet = hasProject
    ? new Set(projectGoalIdsMap.get(selectedProjectId!) ?? [])
    : null;
  const projectConstraintActive = hasProject && projectGoalSet!.size > 0;

  // Task constraint: goals linked to selected tasks OR to their projects.
  // This is intentionally asymmetric with computeFilteredTasks (which only uses
  // direct goal-task links). A task belongs to one project, so its project's goals
  // are relevant. But a goal's projects may have many unrelated tasks, so we don't
  // include goal→project→tasks indirect links.
  const taskGoalIds = hasTasks ? new Set<string>() : null;
  if (hasTasks && taskGoalIdsMap) {
    for (const t of selectedTasks!) {
      for (const gId of taskGoalIdsMap.get(t.id) ?? []) {
        taskGoalIds!.add(gId);
      }
      // Also include goals linked to the task's project
      if (t.project_id) {
        for (const gId of projectGoalIdsMap.get(t.project_id) ?? []) {
          taskGoalIds!.add(gId);
        }
      }
    }
  }

  return goals.filter((goal) => {
    if (preselectedGoalIds?.includes(goal.id)) return true;
    const goalAreaIds = getEntityAreaIds(goal);
    // Unassigned goals stay visible when an area filter is active.
    // Without an area filter they must satisfy project/task constraints.
    if (hasAreas && goalAreaIds.length === 0) return true;

    if (hasAreas) {
      if (!selectedAreaIds!.some((aId) => goalMatchesAreaId(goal, aId))) return false;
    }

    if (projectConstraintActive && !projectGoalSet!.has(goal.id)) return false;

    if (hasTasks && taskGoalIds!.size > 0 && !taskGoalIds!.has(goal.id)) return false;

    return true;
  });
}

/**
 * Returns tasks satisfying ALL active constraints (AND-intersection):
 * - areaIds      → task's area_id or linkedAreaIds overlaps selected areas
 * - projectId    → task's project_id matches
 * - goalIds      → task appears in goalTaskIdsMap for any selected goal
 *                  (direct links only — no indirect link through projects)
 * When multiple are active, task must match ALL of them.
 */
export function computeFilteredTasks<T extends FilterableTask>(
  tasks: T[],
  selectedAreaIds: string[] | null | undefined,
  selectedProjectId: string | null | undefined,
  selectedGoalIds: string[],
  goalTaskIdsMap?: Map<string, string[]>,
  preselectedTaskIds?: string[],
): T[] {
  const hasAreas = selectedAreaIds && selectedAreaIds.length > 0;
  const hasProject = Boolean(selectedProjectId);
  const hasGoals = selectedGoalIds.length > 0;

  if (!hasAreas && !hasProject && !hasGoals) return tasks;

  const areaSet = hasAreas ? new Set(selectedAreaIds) : null;

  // Build set of task IDs allowed by goals
  const goalTaskIdSet = hasGoals
    ? new Set(
        selectedGoalIds.flatMap((gId) => goalTaskIdsMap?.get(gId) ?? []),
      )
    : null;
  const goalConstraintActive = hasGoals && goalTaskIdSet!.size > 0;

  return tasks.filter((t) => {
    if (preselectedTaskIds?.includes(t.id)) return true;
    if (hasAreas) {
      const taskAreas = getEntityAreaIds(t);
      // Unassigned tasks (no area_id, no linkedAreaIds) are always shown so
      // the user can still attach them regardless of what area/project/goal is active.
      if (taskAreas.length === 0) return true;
      if (!taskAreas.some((aId) => areaSet!.has(aId))) return false;
    }

    if (hasProject && t.project_id !== selectedProjectId) return false;

    if (goalConstraintActive && !goalTaskIdSet!.has(t.id)) return false;

    return true;
  });
}
