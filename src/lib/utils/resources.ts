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

export function getResourceLinkedAreaIds(resource: Resource): string[] {
  if (resource.linkedAreaIds && resource.linkedAreaIds.length > 0) {
    return resource.linkedAreaIds;
  }
  return resource.area_id ? [resource.area_id] : [];
}

export function getResourceLinkedGoalIds(resource: Resource): string[] {
  return resource.linkedGoalIds ?? [];
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

export function getEffectiveResourceProjectIds(params: {
  resource: Resource;
  tasksById: Map<string, Pick<Task, "project_id" | "linkedProjectIds">>;
  goalProjectIdsMap: Map<string, string[]>;
}): string[] {
  const { resource, tasksById, goalProjectIdsMap } = params;

  const taskProjectIds = getResourceLinkedTaskIds(resource).flatMap((taskId) =>
    getTaskLinkedProjectIds(tasksById.get(taskId) ?? { project_id: null, linkedProjectIds: [] }),
  );
  const goalProjectIds = getResourceLinkedGoalIds(resource).flatMap(
    (goalId) => goalProjectIdsMap.get(goalId) ?? [],
  );

  return dedupe([resource.project_id, ...taskProjectIds, ...goalProjectIds]);
}
