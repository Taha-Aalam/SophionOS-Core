import { TASK_STATUS, type TaskStatus } from "./constants";

export interface TaskCompletionPatch {
  is_completed?: boolean;
  completed_at?: string | null;
  status?: TaskStatus;
  previous_status?: TaskStatus | null;
}

/** Patch for marking a task complete from `currentStatus`. */
export function buildCompletePatch(currentStatus: TaskStatus, now: string): TaskCompletionPatch {
  const patch: TaskCompletionPatch = {
    is_completed: true,
    completed_at: now,
    status: TASK_STATUS.COMPLETED,
  };
  // Only stash the prior status when we are actually transitioning into completed.
  if (currentStatus !== TASK_STATUS.COMPLETED) {
    patch.previous_status = currentStatus;
  }
  return patch;
}

/** Patch for un-completing a task; restores `previousStatus` or `fallbackStatus`. */
export function buildUncompletePatch(
  previousStatus: TaskStatus | null,
  fallbackStatus: TaskStatus,
): TaskCompletionPatch {
  return {
    is_completed: false,
    completed_at: null,
    status: previousStatus ?? fallbackStatus,
    previous_status: null,
  };
}

/**
 * Given an incoming update payload (which may carry `status` and/or
 * `is_completed`) and the current row, returns the extra fields needed to keep
 * `is_completed === (status === 'completed')`. Returns `{}` when no completion
 * change is implied.
 */
export function resolveTaskCompletionOnUpdate(args: {
  incomingStatus?: TaskStatus;
  incomingIsCompleted?: boolean;
  current: { status: TaskStatus; is_completed: boolean; previous_status: TaskStatus | null };
  fallbackStatus: TaskStatus;
  now: string;
}): TaskCompletionPatch {
  const { incomingStatus, incomingIsCompleted, current, fallbackStatus, now } = args;

  // Determine the target completed-state from whichever field the caller sent.
  let targetCompleted: boolean;
  if (incomingStatus !== undefined) {
    targetCompleted = incomingStatus === TASK_STATUS.COMPLETED;
  } else if (incomingIsCompleted !== undefined) {
    targetCompleted = incomingIsCompleted;
  } else {
    return {};
  }

  const wasCompleted = current.is_completed || current.status === TASK_STATUS.COMPLETED;

  if (targetCompleted === wasCompleted) {
    return {};
  }

  if (targetCompleted) {
    return buildCompletePatch(current.status, now);
  }

  const restored = buildUncompletePatch(current.previous_status, fallbackStatus);
  if (incomingStatus !== undefined) {
    restored.status = incomingStatus;
  }
  return restored;
}
