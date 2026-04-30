import { getGoalLinkedAreaIds } from "@/lib/utils/goals";

export function filterProjectDialogGoals<TGoal extends { area_id: string | null; linkedAreaIds?: string[] }>(
  goals: TGoal[],
  selectedAreaIds: string[],
): TGoal[] {
  if (selectedAreaIds.length === 0) {
    return goals;
  }

  const selectedAreaIdSet = new Set(selectedAreaIds);
  return goals.filter((goal) =>
    getGoalLinkedAreaIds(goal).some((areaId) => selectedAreaIdSet.has(areaId)),
  );
}

export function filterProjectDialogAreas<
  TArea extends { id: string },
  TGoal extends { id: string; area_id: string | null; linkedAreaIds?: string[] },
>(
  areas: TArea[],
  goals: TGoal[],
  selectedAreaIds: string[],
  selectedGoalIds: string[],
): TArea[] {
  if (selectedGoalIds.length === 0) {
    return areas;
  }

  const selectedGoalIdSet = new Set(selectedGoalIds);
  const allowedAreaIds = new Set(
    goals
      .filter((goal) => selectedGoalIdSet.has(goal.id))
      .flatMap((goal) => getGoalLinkedAreaIds(goal)),
  );

  if (allowedAreaIds.size === 0) {
    return [];
  }

  return areas.filter((area) => allowedAreaIds.has(area.id));
}
