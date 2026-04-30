/**
 * Helpers for goal-scoped entity creation flows
 * (Add Project / Add Task from a goal detail page).
 *
 * In goal-scoped mode the parent goal locks the entity's area
 * and goal linkage, and (for tasks) restricts which projects can
 * be selected to those already linked to the goal.
 */

export interface GoalScopedConfig {
  goalId: string;
  areaId: string | null;
  /**
   * All area ids linked to the parent goal. Used by display layers to render
   * resolved area names when no single primary area is set on the goal.
   * Persistence still uses `areaId` (the primary area) when applying defaults.
   */
  linkedAreaIds?: string[];
}

export interface GoalScopedTaskConfig extends GoalScopedConfig {
  /** UUIDs of projects already linked to the parent goal. */
  allowedProjectIds: string[];
}

export interface AreaIdGoalLinked {
  area_id: string;
  goal_ids: string[];
}

/**
 * Returns the area_id and goal_ids that should be persisted for a
 * goal-scoped create flow, regardless of what the user typed in
 * (the UI hides those fields, but we defensively re-apply on submit).
 */
export function applyGoalScopedDefaults<T extends AreaIdGoalLinked>(
  values: T,
  config: GoalScopedConfig,
): T {
  return {
    ...values,
    area_id: config.areaId ?? "",
    goal_ids: [config.goalId],
  };
}

/**
 * Filter a list of projects to only those whose id is in
 * `allowedProjectIds`. Used to restrict the project picker on
 * goal-scoped Add Task to projects already linked to that goal.
 */
export function filterAllowedProjectsForGoal<T extends { id: string }>(
  projects: T[],
  allowedProjectIds: string[],
): T[] {
  if (!allowedProjectIds.length) return [];
  const allowed = new Set(allowedProjectIds);
  return projects.filter((project) => allowed.has(project.id));
}

/**
 * Returns true if the given project id is allowed to be selected
 * under the goal-scoped task flow.
 */
export function isProjectAllowedForGoalScopedTask(
  projectId: string | null | undefined,
  allowedProjectIds: string[],
): boolean {
  if (!projectId) return true; // unassigned is always allowed
  return allowedProjectIds.includes(projectId);
}
