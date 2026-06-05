import {
  NOTE_STATUS,
  PROJECT_STATUS,
  RESOURCE_STATUS,
  TASK_STATUS,
  type ProjectStatus,
  type TaskStatus,
} from "./constants";

type Maybe = string | null | undefined;

/** True when any scalar id is truthy, any id array is non-empty, or a date is set. */
function hasAny(...values: Array<Maybe | string[]>): boolean {
  return values.some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}

/**
 * Task context = area, goal, or project. The task's status only commits
 * to `todo` when BOTH (a) it has at least one PARA link AND (b) it has
 * a due date. A task with only a link (no date) is still `inbox`, and
 * a task with only a due date (no link) is also `inbox` — both signals
 * are required for the task to be considered fully committed.
 */
export function deriveTaskStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  goal_ids?: string[];
  project_id?: Maybe;
  project_ids?: string[];
  due_date?: Maybe;
}): TaskStatus {
  const hasContext = hasAny(
    input.area_id,
    input.area_ids,
    input.goal_ids,
    input.project_id,
    input.project_ids,
  );
  const hasDueDate = Boolean(input.due_date);
  return hasContext && hasDueDate ? TASK_STATUS.TODO : TASK_STATUS.INBOX;
}

/**
 * Note context = area, project, goal, task, OR topic.
 * No context → inbox. Any context → to_review.
 */
export function deriveNoteStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  project_ids?: string[];
  goal_ids?: string[];
  task_ids?: string[];
  topic_id?: Maybe;
}): typeof NOTE_STATUS.TO_REVIEW | typeof NOTE_STATUS.INBOX {
  return hasAny(
    input.area_id,
    input.area_ids,
    input.project_id,
    input.project_ids,
    input.goal_ids,
    input.task_ids,
    input.topic_id,
  )
    ? NOTE_STATUS.TO_REVIEW
    : NOTE_STATUS.INBOX;
}

/**
 * Resource context = area, project, goal, task, OR topic.
 * No context → inbox. Any context → to_review.
 */
export function deriveResourceStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  goal_ids?: string[];
  task_ids?: string[];
  topic_id?: Maybe;
}): typeof RESOURCE_STATUS.TO_REVIEW | typeof RESOURCE_STATUS.INBOX {
  return hasAny(
    input.area_id,
    input.area_ids,
    input.project_id,
    input.goal_ids,
    input.task_ids,
    input.topic_id,
  )
    ? RESOURCE_STATUS.TO_REVIEW
    : RESOURCE_STATUS.INBOX;
}

/**
 * Project context = area OR goal.
 * No context → inbox. Context present → planning only when both
 * start_date and due_date are set; otherwise stays in inbox.
 */
export function deriveProjectStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  goal_ids?: string[];
  start_date?: Maybe;
  due_date?: Maybe;
}): ProjectStatus {
  const hasContext = hasAny(input.area_id, input.area_ids, input.goal_ids);
  if (!hasContext) return PROJECT_STATUS.INBOX;

  const hasDates = Boolean(input.start_date) && Boolean(input.due_date);
  return hasDates ? PROJECT_STATUS.PLANNING : PROJECT_STATUS.INBOX;
}
