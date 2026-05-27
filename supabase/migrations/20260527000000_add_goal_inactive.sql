-- Add is_inactive flag to goals so the goals workflow distinguishes
-- "paused" goals (inactive) from soft-deleted ones (archived).
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS is_inactive BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN goals.is_inactive IS
  'User-paused goal. Hidden from active views but not archived.';

CREATE INDEX IF NOT EXISTS idx_goals_is_inactive ON goals(is_inactive);
