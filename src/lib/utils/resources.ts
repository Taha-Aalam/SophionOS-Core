import type { Resource, Task } from "@/lib/types/domain.types";

export const RESOURCE_VIEW = {
  ALL: "all",
  INBOX: "inbox",
  TO_REVIEW: "to_review",
  ACTIVE: "active",
  FAVORITE: "favorite",
  BY_TOPIC: "by_topic",
  BY_AREA: "by_area",
  BY_GOAL: "by_goal",
  BY_PROJECT: "by_project",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export type ResourceView = (typeof RESOURCE_VIEW)[keyof typeof RESOURCE_VIEW];

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
}

export function getEffectiveResourceProjectIds({
  resource,
  tasksById,
  goalProjectIdsMap,
}: {
  resource: Resource;
  tasksById: Map<string, Pick<Task, "project_id" | "linkedProjectIds">>;
  goalProjectIdsMap: Map<string, string[]>;
}): string[] {
  const direct: string[] = [];
  if (resource.project_id) direct.push(resource.project_id);
  if (resource.linkedProjectIds) direct.push(...resource.linkedProjectIds);

  const taskDerived: string[] = [];
  for (const taskId of resource.linkedTaskIds ?? []) {
    const task = tasksById.get(taskId);
    if (!task) continue;
    if (task.project_id) taskDerived.push(task.project_id);
    if (task.linkedProjectIds) taskDerived.push(...task.linkedProjectIds);
  }

  const goalDerived: string[] = [];
  for (const goalId of resource.linkedGoalIds ?? []) {
    const goalProjectIds = goalProjectIdsMap.get(goalId);
    if (goalProjectIds) goalDerived.push(...goalProjectIds);
  }

  return dedupe([...direct, ...taskDerived, ...goalDerived]);
}

export function getResourceLinkedAreaIds(resource: Resource): string[] {
  if (resource.linkedAreaIds && resource.linkedAreaIds.length > 0) {
    return resource.linkedAreaIds;
  }
  return resource.area_id ? [resource.area_id] : [];
}

export function getResourceLinkedGoalIds(resource: Resource): string[] {
  return resource.linkedGoalIds ?? [];
}

export function getResourceLinkedProjectIds(resource: Resource): string[] {
  return resource.linkedProjectIds ?? [];
}

export function getResourceLinkedTaskIds(resource: Resource): string[] {
  return resource.linkedTaskIds ?? [];
}

export function getTaskLinkedProjectIds(task: Pick<Task, "project_id" | "linkedProjectIds">): string[] {
  if (task.linkedProjectIds && task.linkedProjectIds.length > 0) {
    return task.linkedProjectIds;
  }
  return task.project_id ? [task.project_id] : [];
}
