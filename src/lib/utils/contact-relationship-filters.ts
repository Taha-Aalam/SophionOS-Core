/**
 * Pure functions for contact-relationship filtering rules.
 *
 * These encode the canonical precedence:
 *   tasks > goals > projects > areas (for areas/projects)
 *   goals > projects > areas         (for tasks)
 *   tasks > projects > areas         (for goals)
 */

// ---------------------------------------------------------------------------
// Types – intentionally minimal, matching the shapes the dialog/page already have
// ---------------------------------------------------------------------------

export interface EntityWithArea {
  id: string;
  area_id?: string | null;
  linkedAreaIds?: string[];
}

export interface EntityBase {
  id: string;
}

export interface AreaEntity extends EntityBase {
  name: string;
  archive?: boolean;
  icon?: string | null;
}

export interface GoalEntity extends EntityBase {
  name: string;
  is_archived?: boolean;
  linkedAreaIds?: string[];
  area_id?: string | null;
}

export interface ProjectEntity extends EntityBase {
  name: string;
  is_archived?: boolean;
  linkedAreaIds?: string[];
  area_id?: string | null;
}

export interface TaskEntity extends EntityBase {
  name: string;
  linkedAreaIds?: string[];
  area_id?: string | null;
  project_id?: string | null;
}

export interface GoalProjectRelation {
  goal_id: string;
  project_id: string;
}

export interface GoalTaskRelation {
  goal_id: string;
  task_id: string;
}

export interface FilterInputs {
  allAreas: AreaEntity[];
  allGoals: GoalEntity[];
  allProjects: ProjectEntity[];
  allTasks: TaskEntity[];
  selectedAreaIds: string[];
  selectedGoalIds: string[];
  selectedProjectIds: string[];
  selectedTaskIds: string[];
  goalProjectRelations: GoalProjectRelation[];
  goalTaskRelations: GoalTaskRelation[];
}

export interface FilteredResults {
  visibleAreas: AreaEntity[];
  filteredGoals: GoalEntity[];
  filteredProjects: ProjectEntity[];
  filteredTasks: TaskEntity[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the area ids associated with an entity, preferring linkedAreaIds. */
function getEntityAreaIds(entity: EntityWithArea): string[] {
  if (entity.linkedAreaIds && entity.linkedAreaIds.length > 0) {
    return entity.linkedAreaIds;
  }
  return entity.area_id ? [entity.area_id] : [];
}

// ---------------------------------------------------------------------------
// Build reverse-lookup maps from relation arrays
// ---------------------------------------------------------------------------

export function buildGoalProjectMaps(relations: GoalProjectRelation[]) {
  const goalToProjectIds = new Map<string, string[]>();
  const projectToGoalIds = new Map<string, string[]>();

  for (const { goal_id, project_id } of relations) {
    const gp = goalToProjectIds.get(goal_id) ?? [];
    gp.push(project_id);
    goalToProjectIds.set(goal_id, gp);

    const pg = projectToGoalIds.get(project_id) ?? [];
    pg.push(goal_id);
    projectToGoalIds.set(project_id, pg);
  }

  return { goalToProjectIds, projectToGoalIds };
}

export function buildGoalTaskMaps(relations: GoalTaskRelation[]) {
  const goalToTaskIds = new Map<string, string[]>();
  const taskToGoalIds = new Map<string, string[]>();

  for (const { goal_id, task_id } of relations) {
    const gt = goalToTaskIds.get(goal_id) ?? [];
    gt.push(task_id);
    goalToTaskIds.set(goal_id, gt);

    const tg = taskToGoalIds.get(task_id) ?? [];
    tg.push(goal_id);
    taskToGoalIds.set(task_id, tg);
  }

  return { goalToTaskIds, taskToGoalIds };
}

// ---------------------------------------------------------------------------
// Individual filter functions
// ---------------------------------------------------------------------------

/**
 * Returns areas satisfying ALL active constraints (AND-intersection):
 * - projects → projects' areas
 * - goals    → goals' areas
 * - tasks    → tasks' areas
 * When multiple are active, areas must match ALL of them.
 */
export function filterAreas(
  inputs: Pick<
    FilterInputs,
    "allAreas" | "selectedAreaIds" | "selectedGoalIds" | "selectedProjectIds" | "selectedTaskIds"
  > & {
    selectedTasks: TaskEntity[];
    selectedGoals: GoalEntity[];
    selectedProjects: ProjectEntity[];
  },
): AreaEntity[] {
  const { allAreas, selectedTasks, selectedGoals, selectedProjects } = inputs;
  const activeAreas = allAreas.filter((a) => !a.archive);

  const hasProjects = inputs.selectedProjectIds.length > 0;
  const hasGoals = inputs.selectedGoalIds.length > 0;
  const hasTasks = inputs.selectedTaskIds.length > 0;

  if (!hasProjects && !hasGoals && !hasTasks) return activeAreas;

  let allowed: Set<string> | null = null;

  if (hasProjects) {
    const projectAreas = new Set(selectedProjects.flatMap(getEntityAreaIds));
    allowed = projectAreas;
  }

  if (hasGoals) {
    const goalAreas = new Set(selectedGoals.flatMap(getEntityAreaIds));
    allowed = allowed
      ? new Set([...allowed].filter((id) => goalAreas.has(id)))
      : goalAreas;
  }

  if (hasTasks) {
    const taskAreas = new Set(selectedTasks.flatMap(getEntityAreaIds));
    allowed = allowed
      ? new Set([...allowed].filter((id) => taskAreas.has(id)))
      : taskAreas;
  }

  if (allowed && allowed.size === 0) return activeAreas;
  return allowed ? activeAreas.filter((a) => allowed!.has(a.id)) : activeAreas;
}

/**
 * Returns projects satisfying ALL active constraints (AND-intersection):
 * - areas → projects' area_id/linkedAreaIds overlap selected areas
 * - goals → projects appear in goalToProjectIds for selected goals
 * - tasks → projects are the project_id of any selected task
 * When multiple are active, project must match ALL of them.
 */
export function filterProjects(
  inputs: Pick<
    FilterInputs,
    "allProjects" | "selectedAreaIds" | "selectedGoalIds" | "selectedProjectIds" | "selectedTaskIds"
  > & {
    selectedTasks: TaskEntity[];
    goalToProjectIds: Map<string, string[]>;
  },
): ProjectEntity[] {
  const { allProjects, selectedTasks, goalToProjectIds } = inputs;
  const activeProjects = allProjects.filter((p) => !p.is_archived);

  const hasAreas = inputs.selectedAreaIds.length > 0;
  const hasGoals = inputs.selectedGoalIds.length > 0;
  const hasTasks = inputs.selectedTaskIds.length > 0;

  if (!hasAreas && !hasGoals && !hasTasks) return activeProjects;

  const areaSet = new Set(inputs.selectedAreaIds);

  const taskProjectIds = hasTasks
    ? new Set(selectedTasks.map((t) => t.project_id).filter(Boolean) as string[])
    : null;

  const goalProjectIds = hasGoals
    ? new Set(inputs.selectedGoalIds.flatMap((gId) => goalToProjectIds.get(gId) ?? []))
    : null;

  const candidates = activeProjects.filter((p) => {
    if (hasAreas) {
      const projectAreas = getEntityAreaIds(p);
      if (!projectAreas.some((aId) => areaSet.has(aId))) return false;
    }
    if (hasGoals && goalProjectIds && !goalProjectIds.has(p.id)) return false;
    if (hasTasks && taskProjectIds && !taskProjectIds.has(p.id)) return false;
    return true;
  });
  // Fallback: when the intersection collapses to empty, surface the full
  // project list so the user can still link a project.
  if (candidates.length === 0) return activeProjects;
  return candidates;
}

/**
 * Returns goals satisfying ALL active constraints (AND-intersection):
 * - areas    → goals' area_id/linkedAreaIds overlap selected areas
 * - projects → goals appear in projectToGoalIds for selected projects
 * - tasks    → goals linked to tasks OR to tasks' projects
 * When multiple are active, goal must match ALL of them.
 */
export function filterGoals(
  inputs: Pick<
    FilterInputs,
    "allGoals" | "selectedAreaIds" | "selectedGoalIds" | "selectedProjectIds" | "selectedTaskIds"
  > & {
    selectedTasks: TaskEntity[];
    taskToGoalIds: Map<string, string[]>;
    projectToGoalIds: Map<string, string[]>;
  },
): GoalEntity[] {
  const { allGoals, selectedTasks, taskToGoalIds, projectToGoalIds } = inputs;
  const activeGoals = allGoals.filter((g) => !g.is_archived);

  const hasAreas = inputs.selectedAreaIds.length > 0;
  const hasProjects = inputs.selectedProjectIds.length > 0;
  const hasTasks = inputs.selectedTaskIds.length > 0;

  if (!hasAreas && !hasProjects && !hasTasks) return activeGoals;

  const projectGoalIds = hasProjects
    ? new Set(inputs.selectedProjectIds.flatMap((pId) => projectToGoalIds.get(pId) ?? []))
    : null;
  const projectConstraintActive = hasProjects && projectGoalIds!.size > 0;

  // Task constraint: goals linked to tasks OR to tasks' projects
  // Asymmetric: task→project→goal is included, but goal→project→task is not
  const taskGoalIds = hasTasks ? new Set<string>() : null;
  if (hasTasks) {
    for (const taskId of inputs.selectedTaskIds) {
      for (const gId of taskToGoalIds.get(taskId) ?? []) {
        taskGoalIds!.add(gId);
      }
    }
    for (const task of selectedTasks) {
      if (task.project_id) {
        for (const gId of projectToGoalIds.get(task.project_id) ?? []) {
          taskGoalIds!.add(gId);
        }
      }
    }
  }

  const candidates = activeGoals.filter((g) => {
    if (projectConstraintActive && !projectGoalIds!.has(g.id)) return false;
    if (hasTasks && taskGoalIds!.size > 0 && !taskGoalIds!.has(g.id)) return false;
    if (hasAreas) {
      const goalAreas = getEntityAreaIds(g);
      if (!inputs.selectedAreaIds.some((aId) => goalAreas.includes(aId))) return false;
    }
    return true;
  });
  // Fallback: when the intersection collapses to empty, surface the full
  // goal list so the user can still link a goal.
  if (candidates.length === 0) return activeGoals;
  return candidates;
}

/**
 * Returns tasks satisfying ALL active constraints (AND-intersection):
 * - areas    → tasks' area_id/linkedAreaIds overlap selected areas
 * - projects → tasks' project_id is in selected projects
 * - goals    → tasks appear in goalToTaskIds for selected goals
 *              (direct links only — no indirect link through projects)
 * When multiple are active, task must match ALL of them.
 */
export function filterTasks(
  inputs: Pick<
    FilterInputs,
    "allTasks" | "selectedAreaIds" | "selectedGoalIds" | "selectedProjectIds"
  > & {
    goalToTaskIds: Map<string, string[]>;
  },
): TaskEntity[] {
  const { allTasks, goalToTaskIds } = inputs;

  const hasAreas = inputs.selectedAreaIds.length > 0;
  const hasProjects = inputs.selectedProjectIds.length > 0;
  const hasGoals = inputs.selectedGoalIds.length > 0;

  if (!hasAreas && !hasProjects && !hasGoals) return allTasks;

  const areaSet = hasAreas ? new Set(inputs.selectedAreaIds) : null;
  const projectSet = hasProjects ? new Set(inputs.selectedProjectIds) : null;

  const goalTaskIdSet = hasGoals
    ? new Set(inputs.selectedGoalIds.flatMap((gId) => goalToTaskIds.get(gId) ?? []))
    : null;
  const goalConstraintActive = hasGoals && goalTaskIdSet!.size > 0;

  const candidates = allTasks.filter((t) => {
    if (hasAreas) {
      const taskAreas = getEntityAreaIds(t);
      if (!taskAreas.some((aId) => areaSet!.has(aId))) return false;
    }
    if (hasProjects && (t.project_id == null || !projectSet!.has(t.project_id))) return false;
    if (goalConstraintActive && !goalTaskIdSet!.has(t.id)) return false;
    return true;
  });
  // Fallback: when the intersection collapses to empty, surface the full
  // task list so the user can still link a task.
  if (candidates.length === 0) return allTasks;
  return candidates;
}

// ---------------------------------------------------------------------------
// Cleanup: remove invalid selections given the current filtered lists
// ---------------------------------------------------------------------------

export interface CleanupResult {
  areaIds: string[];
  goalIds: string[];
  projectIds: string[];
  taskIds: string[];
  changed: boolean;
}

/**
 * Given current selections and the filtered option lists, strip any ids that
 * are no longer valid.  Returns the cleaned ids + a `changed` flag so callers
 * know whether to update state.
 */
export function cleanInvalidSelections(
  ids: Pick<FilterInputs, "selectedAreaIds" | "selectedGoalIds" | "selectedProjectIds" | "selectedTaskIds">,
  filtered: FilteredResults,
): CleanupResult {
  const areaIds = ids.selectedAreaIds.filter((id) =>
    filtered.visibleAreas.some((a) => a.id === id),
  );
  const goalIds = ids.selectedGoalIds.filter((id) =>
    filtered.filteredGoals.some((g) => g.id === id),
  );
  const projectIds = ids.selectedProjectIds.filter((id) =>
    filtered.filteredProjects.some((p) => p.id === id),
  );
  const taskIds = ids.selectedTaskIds.filter((id) =>
    filtered.filteredTasks.some((t) => t.id === id),
  );

  const changed =
    areaIds.length !== ids.selectedAreaIds.length ||
    goalIds.length !== ids.selectedGoalIds.length ||
    projectIds.length !== ids.selectedProjectIds.length ||
    taskIds.length !== ids.selectedTaskIds.length;

  return { areaIds, goalIds, projectIds, taskIds, changed };
}

// ---------------------------------------------------------------------------
// Orchestrator: compute everything in one call
// ---------------------------------------------------------------------------

/**
 * Single entry point.  Given all entity lists, current selections, and
 * goal↔project/goal↔task relations, returns the filtered option lists for
 * each entity type.
 */
export function computeFilteredOptions(inputs: FilterInputs): FilteredResults {
  const { goalToProjectIds, projectToGoalIds } = buildGoalProjectMaps(
    inputs.goalProjectRelations,
  );
  const { goalToTaskIds, taskToGoalIds } = buildGoalTaskMaps(inputs.goalTaskRelations);

  const selectedTasks = inputs.allTasks.filter((t) =>
    inputs.selectedTaskIds.includes(t.id),
  );
  const selectedGoals = inputs.allGoals.filter((g) =>
    inputs.selectedGoalIds.includes(g.id),
  );
  const selectedProjects = inputs.allProjects.filter((p) =>
    inputs.selectedProjectIds.includes(p.id),
  );

  const visibleAreas = filterAreas({
    ...inputs,
    selectedTasks,
    selectedGoals,
    selectedProjects,
  });

  const filteredProjects = filterProjects({
    ...inputs,
    selectedTasks,
    goalToProjectIds,
  });

  const filteredGoals = filterGoals({
    ...inputs,
    selectedTasks,
    taskToGoalIds,
    projectToGoalIds,
  });

  const filteredTasks = filterTasks({
    ...inputs,
    goalToTaskIds,
  });

  return { visibleAreas, filteredGoals, filteredProjects, filteredTasks };
}
