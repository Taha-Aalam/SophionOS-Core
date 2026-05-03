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
  area_id?: string;
  area_ids?: string[];
  goal_ids: string[];
}

/**
 * Returns the area_id and goal_ids that should be persisted for a
 * goal-scoped create flow, regardless of what the user typed in
 * (the UI hides those fields, but we defensively re-apply on submit).
 *
 * When the goal has multiple linked areas (multi-area mode) the form
 * renders a Select that lets the user pick one of the scoped areas.
 * In that case the user's chosen area_id is preserved as long as it
 * belongs to the goal's scoped area set. Unknown / unrelated area_ids
 * still fall back to config.areaId ?? "".
 */
export function applyGoalScopedDefaults<T extends AreaIdGoalLinked>(
  values: T,
  config: GoalScopedConfig,
): T {
  const scopedAreaIds = new Set<string>();
  if (config.areaId) scopedAreaIds.add(config.areaId);
  for (const id of config.linkedAreaIds ?? []) {
    if (id) scopedAreaIds.add(id);
  }

  if (values.area_ids !== undefined) {
    const validAreaIds = values.area_ids.filter((id) => scopedAreaIds.has(id));
    const fallback = config.areaId ?? "";
    const guardedAreaIds =
      validAreaIds.length > 0 ? validAreaIds : fallback ? [fallback] : [];
    const resolvedAreaId = guardedAreaIds[0] ?? fallback;
    return {
      ...values,
      area_id: resolvedAreaId,
      area_ids: guardedAreaIds,
      goal_ids: [config.goalId],
    };
  }

  const resolvedAreaId =
    scopedAreaIds.size > 0 && values.area_id && scopedAreaIds.has(values.area_id)
      ? values.area_id
      : (config.areaId ?? "");
  return {
    ...values,
    area_id: resolvedAreaId,
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

/**
 * Returns the full list of area IDs that should be presented in a scoped task
 * creation dialog (goal-scoped or project-scoped).
 *
 * Prefers `linkedAreaIds` (which already includes the primary `areaId`) so that
 * multi-area entities always surface all selectable areas. Falls back to
 * `[areaId]` when no `linkedAreaIds` are provided, then to `[]`.
 */
export function getScopedCandidateAreaIds(config: {
  areaId: string | null;
  linkedAreaIds?: string[];
}): string[] {
  if (config.linkedAreaIds?.length) return config.linkedAreaIds;
  if (config.areaId) return [config.areaId];
  return [];
}

/**
 * Resolves the human-readable label for a scoped area Select trigger.
 * This avoids showing the raw UUID when the Select library falls back to
 * rendering the selected value instead of the item text.
 */
export function getScopedAreaDisplayLabel<TArea extends {
  id: string;
  name: string;
  icon?: string | null;
}>(
  areas: TArea[],
  selectedAreaId: string | null | undefined,
): string | undefined {
  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? areas[0];

  if (!selectedArea) {
    return undefined;
  }

  return `${selectedArea.icon ? `${selectedArea.icon} ` : ""}${selectedArea.name}`;
}

/**
 * Guards the submitted `area_id` for project-scoped task creation.
 * Mirrors the defensive behaviour of `applyGoalScopedDefaults` for goal-scoped tasks:
 * if the form value is one of the project's linked areas it is preserved;
 * otherwise it falls back to the primary `areaId` (or the first linked area).
 *
 * This keeps task persistence to a single `area_id` while ensuring the saved
 * value is always within the project's scope.
 */
export function applyProjectScopedAreaGuard<T extends { area_id?: string | null | undefined; area_ids?: string[] }>(
  values: T,
  config: { areaId: string | null; linkedAreaIds?: string[] },
): T {
  const scopedAreaIds = new Set<string>();
  if (config.areaId) scopedAreaIds.add(config.areaId);
  for (const id of config.linkedAreaIds ?? []) {
    if (id) scopedAreaIds.add(id);
  }

  if (scopedAreaIds.size === 0) return values;

  if (values.area_ids !== undefined) {
    const validAreaIds = values.area_ids.filter((id) => scopedAreaIds.has(id));
    const fallbackAreaId = config.areaId ?? [...scopedAreaIds][0] ?? null;
    const guardedAreaIds =
      validAreaIds.length > 0 ? validAreaIds : fallbackAreaId ? [fallbackAreaId] : [];
    const resolvedAreaId = guardedAreaIds[0] ?? fallbackAreaId;
    return { ...values, area_id: resolvedAreaId, area_ids: guardedAreaIds };
  }

  const chosenAreaId = values.area_id ?? null;
  const guardedAreaId =
    chosenAreaId !== null && scopedAreaIds.has(chosenAreaId)
      ? chosenAreaId
      : (config.areaId ?? [...scopedAreaIds][0] ?? null);

  return { ...values, area_id: guardedAreaId };
}
