-- Remembers the status a task held before it was completed, so un-completing
-- can restore it. Nullable; only set while a task is in the completed state.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS previous_status task_status;
