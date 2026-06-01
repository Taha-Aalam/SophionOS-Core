import {
  NOTE_STATUS,
  PROJECT_STATUS,
  RESOURCE_STATUS,
  TASK_STATUS,
  type ProjectStatus,
  type TaskStatus,
} from "./constants";

type Maybe = string | null | undefined;

/** True when any scalar id is truthy or any id array is non-empty. */
function hasAny(...values: Array<Maybe | string[]>): boolean {
  return values.some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}

/** Task context = area OR project (single or multi). */
export function deriveTaskStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  project_ids?: string[];
}): TaskStatus {
  return hasAny(input.area_id, input.area_ids, input.project_id, input.project_ids)
    ? TASK_STATUS.TODO
    : TASK_STATUS.INBOX;
}

/** Note context = area, project, goal, OR topic. */
export function deriveNoteStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  project_ids?: string[];
  goal_ids?: string[];
  topic_id?: Maybe;
}): typeof NOTE_STATUS.TO_REVIEW | typeof NOTE_STATUS.INBOX {
  return hasAny(
    input.area_id,
    input.area_ids,
    input.project_id,
    input.project_ids,
    input.goal_ids,
    input.topic_id,
  )
    ? NOTE_STATUS.TO_REVIEW
    : NOTE_STATUS.INBOX;
}

/** Resource context = area, project, goal, OR topic. */
export function deriveResourceStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  goal_ids?: string[];
  topic_id?: Maybe;
}): typeof RESOURCE_STATUS.TO_REVIEW | typeof RESOURCE_STATUS.INBOX {
  return hasAny(
    input.area_id,
    input.area_ids,
    input.project_id,
    input.goal_ids,
    input.topic_id,
  )
    ? RESOURCE_STATUS.TO_REVIEW
    : RESOURCE_STATUS.INBOX;
}

/** Project context = area OR goal. */
export function deriveProjectStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  goal_ids?: string[];
}): ProjectStatus {
  return hasAny(input.area_id, input.area_ids, input.goal_ids)
    ? PROJECT_STATUS.PLANNING
    : PROJECT_STATUS.INBOX;
}
