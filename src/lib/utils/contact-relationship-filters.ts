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
 * Visible areas rule precedence:
 * 1. tasks selected  → only areas linked to those tasks
 * 2. goals selected  → only areas linked to those goals
 * 3. projects selected → only areas linked to those projects
 * 4. otherwise       → all active (non-archived) areas
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

  if (inputs.selectedTaskIds.length > 0) {
    const taskAreaIds = new Set(selectedTasks.flatMap(getEntityAreaIds));
    return activeAreas.filter((a) => taskAreaIds.has(a.id));
  }
  if (inputs.selectedGoalIds.length > 0) {
    const goalAreaIds = new Set(selectedGoals.flatMap(getEntityAreaIds));
    return activeAreas.filter((a) => goalAreaIds.has(a.id));
  }
  if (inputs.selectedProjectIds.length > 0) {
    const projectAreaIds = new Set(selectedProjects.flatMap(getEntityAreaIds));
    return activeAreas.filter((a) => projectAreaIds.has(a.id));
  }
  return activeAreas;
}

/**
 * Filtered projects rule precedence:
 * 1. tasks selected    → only projects linked to those tasks
 * 2. goals selected    → only projects linked to those goals
 * 3. areas selected    → only projects linked to those areas
 * 4. otherwise         → all active (non-archived) projects
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

  if (inputs.selectedTaskIds.length > 0) {
    const taskProjectIds = new Set(
      selectedTasks.map((t) => t.project_id).filter(Boolean) as string[],
    );
    return activeProjects.filter((p) => taskProjectIds.has(p.id));
  }
  if (inputs.selectedGoalIds.length > 0) {
    const linkedProjectIds = new Set<string>();
    for (const goalId of inputs.selectedGoalIds) {
      (goalToProjectIds.get(goalId) ?? []).forEach((id) => linkedProjectIds.add(id));
    }
    return activeProjects.filter((p) => linkedProjectIds.has(p.id));
  }
  if (inputs.selectedAreaIds.length > 0) {
    const selectedAreaIdSet = new Set(inputs.selectedAreaIds);
    return activeProjects.filter((p) => {
      const projectAreaIds = new Set(getEntityAreaIds(p));
      return Array.from(selectedAreaIdSet).some((id) => projectAreaIds.has(id));
    });
  }
  return activeProjects;
}

/**
 * Filtered goals rule precedence:
 * 1. tasks selected    → goals linked to those tasks OR to those tasks' projects
 * 2. projects selected → goals linked to those projects
 * 3. areas selected    → goals linked to those areas
 * 4. otherwise         → all active (non-archived) goals
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

  if (inputs.selectedTaskIds.length > 0) {
    const linkedGoalIds = new Set<string>();
    for (const taskId of inputs.selectedTaskIds) {
      (taskToGoalIds.get(taskId) ?? []).forEach((id) => linkedGoalIds.add(id));
    }
    for (const task of selectedTasks) {
      if (task.project_id) {
        (projectToGoalIds.get(task.project_id) ?? []).forEach((id) => linkedGoalIds.add(id));
      }
    }
    return activeGoals.filter((g) => linkedGoalIds.has(g.id));
  }
  if (inputs.selectedProjectIds.length > 0) {
    const linkedGoalIds = new Set<string>();
    for (const projectId of inputs.selectedProjectIds) {
      (projectToGoalIds.get(projectId) ?? []).forEach((id) => linkedGoalIds.add(id));
    }
    return activeGoals.filter((g) => linkedGoalIds.has(g.id));
  }
  if (inputs.selectedAreaIds.length > 0) {
    const selectedAreaIdSet = new Set(inputs.selectedAreaIds);
    return activeGoals.filter((g) => {
      const goalAreaIds = new Set(getEntityAreaIds(g));
      return Array.from(selectedAreaIdSet).some((id) => goalAreaIds.has(id));
    });
  }
  return activeGoals;
}

/**
 * Filtered tasks rule precedence:
 * 1. goals selected    → only tasks linked to those goals
 * 2. projects selected → only tasks for those projects
 * 3. areas selected    → only tasks linked to those areas
 * 4. otherwise         → all tasks
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

  if (inputs.selectedGoalIds.length > 0) {
    const linkedTaskIds = new Set<string>();
    for (const goalId of inputs.selectedGoalIds) {
      (goalToTaskIds.get(goalId) ?? []).forEach((id) => linkedTaskIds.add(id));
    }
    return allTasks.filter((t) => linkedTaskIds.has(t.id));
  }
  if (inputs.selectedProjectIds.length > 0) {
    return allTasks.filter(
      (t) => t.project_id != null && inputs.selectedProjectIds.includes(t.project_id),
    );
  }
  if (inputs.selectedAreaIds.length > 0) {
    const selectedAreaIdSet = new Set(inputs.selectedAreaIds);
    return allTasks.filter((t) => {
      const taskAreaIds = new Set(getEntityAreaIds(t));
      return Array.from(selectedAreaIdSet).some((id) => taskAreaIds.has(id));
    });
  }
  return allTasks;
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
