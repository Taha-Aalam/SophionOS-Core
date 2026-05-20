// src/lib/utils/note-metadata-filters.ts

interface FilterableArea {
  id: string;
}

interface FilterableProject {
  id: string;
  linkedAreaIds?: string[];
  linkedGoalIds?: string[];
}

interface FilterableGoal {
  id: string;
  linkedAreaIds?: string[];
}

interface FilterableTask {
  id: string;
  project_id?: string | null;
}

/**
 * Returns areas satisfying ALL active constraints (AND-intersection):
 * - projects → union of selected projects' linkedAreaIds
 * - goals   → union of selected goals' linkedAreaIds
 * - tasks   → union of tasks' project linkedAreaIds
 * When multiple constraints active, areas must appear in ALL sets.
 */
export function computeNoteVisibleAreas<T extends FilterableArea>(
  areas: T[],
  selectedProjectIds: string[],
  selectedGoalIds: string[],
  selectedTaskIds: string[],
  allProjects: FilterableProject[],
  allGoals: FilterableGoal[],
  allTasks: FilterableTask[],
): T[] {
  const hasProjects = selectedProjectIds.length > 0;
  const hasGoals = selectedGoalIds.length > 0;
  const hasTasks = selectedTaskIds.length > 0;

  if (!hasProjects && !hasGoals && !hasTasks) return areas;

  let allowed: Set<string> | null = null;

  if (hasProjects) {
    const projSet = new Set(selectedProjectIds);
    const projAreas = new Set<string>();
    for (const proj of allProjects) {
      if (projSet.has(proj.id)) {
        for (const aId of proj.linkedAreaIds ?? []) projAreas.add(aId);
      }
    }
    allowed = projAreas;
  }

  if (hasGoals) {
    const goalSet = new Set(selectedGoalIds);
    const goalAreas = new Set<string>();
    for (const goal of allGoals) {
      if (goalSet.has(goal.id)) {
        for (const aId of goal.linkedAreaIds ?? []) goalAreas.add(aId);
      }
    }
    allowed = allowed
      ? new Set([...allowed].filter((id) => goalAreas.has(id)))
      : goalAreas;
  }

  if (hasTasks) {
    const taskSet = new Set(selectedTaskIds);
    const projIds = new Set<string>();
    for (const task of allTasks) {
      if (taskSet.has(task.id) && task.project_id) projIds.add(task.project_id);
    }
    const taskAreas = new Set<string>();
    for (const proj of allProjects) {
      if (projIds.has(proj.id)) {
        for (const aId of proj.linkedAreaIds ?? []) taskAreas.add(aId);
      }
    }
    allowed = allowed
      ? new Set([...allowed].filter((id) => taskAreas.has(id)))
      : taskAreas;
  }

  if (allowed && allowed.size === 0) return [];
  return allowed ? areas.filter((a) => allowed!.has(a.id)) : areas;
}

/**
 * Returns projects satisfying ALL active constraints (AND-intersection):
 * - areas → linkedAreaIds overlaps selected areas
 * - goals → linkedGoalIds overlaps selected goals
 * - tasks → project_id matches selected tasks' project_id
 */
export function computeNoteFilteredProjects<T extends FilterableProject>(
  projects: T[],
  selectedAreaIds: string[],
  selectedGoalIds: string[],
  selectedTaskIds: string[],
  allTasks: FilterableTask[],
): T[] {
  const hasAreas = selectedAreaIds.length > 0;
  const hasGoals = selectedGoalIds.length > 0;
  const hasTasks = selectedTaskIds.length > 0;

  if (!hasAreas && !hasGoals && !hasTasks) return projects;

  let allowed: Set<string> | null = null;

  if (hasAreas) {
    const areaSet = new Set(selectedAreaIds);
    allowed = new Set(
      projects
        .filter((p) => (p.linkedAreaIds ?? []).some((aId) => areaSet.has(aId)))
        .map((p) => p.id),
    );
  }

  if (hasGoals) {
    const goalSet = new Set(selectedGoalIds);
    const goalProjs = new Set(
      projects
        .filter((p) => (p.linkedGoalIds ?? []).some((gId) => goalSet.has(gId)))
        .map((p) => p.id),
    );
    allowed = allowed
      ? new Set([...allowed].filter((id) => goalProjs.has(id)))
      : goalProjs;
  }

  if (hasTasks) {
    const taskSet = new Set(selectedTaskIds);
    const taskProjIds = new Set(
      allTasks.filter((t) => taskSet.has(t.id) && t.project_id).map((t) => t.project_id!),
    );
    allowed = allowed
      ? new Set([...allowed].filter((id) => taskProjIds.has(id)))
      : taskProjIds;
  }

  if (allowed && allowed.size === 0) return [];
  return allowed ? projects.filter((p) => allowed!.has(p.id)) : projects;
}

/**
 * Returns goals satisfying ALL active constraints (AND-intersection):
 * - areas    → linkedAreaIds overlaps selected areas
 * - projects → goal id in project.linkedGoalIds
 * - tasks    → task project → project linkedGoalIds
 */
export function computeNoteFilteredGoals<T extends FilterableGoal>(
  goals: T[],
  selectedAreaIds: string[],
  selectedProjectIds: string[],
  selectedTaskIds: string[],
  allProjects: FilterableProject[],
  allTasks: FilterableTask[],
): T[] {
  const hasAreas = selectedAreaIds.length > 0;
  const hasProjects = selectedProjectIds.length > 0;
  const hasTasks = selectedTaskIds.length > 0;

  if (!hasAreas && !hasProjects && !hasTasks) return goals;

  let allowed: Set<string> | null = null;

  if (hasAreas) {
    const areaSet = new Set(selectedAreaIds);
    allowed = new Set(
      goals
        .filter((g) => (g.linkedAreaIds ?? []).some((aId) => areaSet.has(aId)))
        .map((g) => g.id),
    );
  }

  if (hasProjects) {
    const projSet = new Set(selectedProjectIds);
    const projGoalIds = new Set<string>();
    for (const proj of allProjects) {
      if (projSet.has(proj.id)) {
        for (const gId of proj.linkedGoalIds ?? []) projGoalIds.add(gId);
      }
    }
    allowed = allowed
      ? new Set([...allowed].filter((id) => projGoalIds.has(id)))
      : projGoalIds;
  }

  if (hasTasks) {
    const taskSet = new Set(selectedTaskIds);
    const projIds = new Set<string>();
    for (const task of allTasks) {
      if (taskSet.has(task.id) && task.project_id) projIds.add(task.project_id);
    }
    const taskGoalIds = new Set<string>();
    for (const proj of allProjects) {
      if (projIds.has(proj.id)) {
        for (const gId of proj.linkedGoalIds ?? []) taskGoalIds.add(gId);
      }
    }
    allowed = allowed
      ? new Set([...allowed].filter((id) => taskGoalIds.has(id)))
      : taskGoalIds;
  }

  if (allowed && allowed.size === 0) return [];
  return allowed ? goals.filter((g) => allowed!.has(g.id)) : goals;
}

/**
 * Returns tasks satisfying ALL active constraints (AND-intersection):
 * - areas    → task's project linkedAreaIds overlaps selected areas
 * - projects → task.project_id matches selected projects
 * - goals    → task's project linkedGoalIds matches selected goals
 */
export function computeNoteFilteredTasks<T extends FilterableTask>(
  tasks: T[],
  selectedAreaIds: string[],
  selectedProjectIds: string[],
  selectedGoalIds: string[],
  allProjects: FilterableProject[],
): T[] {
  const hasAreas = selectedAreaIds.length > 0;
  const hasProjects = selectedProjectIds.length > 0;
  const hasGoals = selectedGoalIds.length > 0;

  if (!hasAreas && !hasProjects && !hasGoals) return tasks;

  let allowed: Set<string> | null = null;

  if (hasAreas) {
    const areaSet = new Set(selectedAreaIds);
    const areaProjIds = new Set(
      allProjects
        .filter((p) => (p.linkedAreaIds ?? []).some((aId) => areaSet.has(aId)))
        .map((p) => p.id),
    );
    allowed = new Set(
      tasks.filter((t) => t.project_id && areaProjIds.has(t.project_id)).map((t) => t.id),
    );
  }

  if (hasProjects) {
    const projSet = new Set(selectedProjectIds);
    const projTasks = new Set(
      tasks.filter((t) => t.project_id && projSet.has(t.project_id)).map((t) => t.id),
    );
    allowed = allowed
      ? new Set([...allowed].filter((id) => projTasks.has(id)))
      : projTasks;
  }

  if (hasGoals) {
    const goalSet = new Set(selectedGoalIds);
    const goalProjIds = new Set(
      allProjects
        .filter((p) => (p.linkedGoalIds ?? []).some((gId) => goalSet.has(gId)))
        .map((p) => p.id),
    );
    const goalTasks = new Set(
      tasks.filter((t) => t.project_id && goalProjIds.has(t.project_id)).map((t) => t.id),
    );
    allowed = allowed
      ? new Set([...allowed].filter((id) => goalTasks.has(id)))
      : goalTasks;
  }

  if (allowed && allowed.size === 0) return [];
  return allowed ? tasks.filter((t) => allowed!.has(t.id)) : tasks;
}
