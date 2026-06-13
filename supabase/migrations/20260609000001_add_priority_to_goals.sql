-- Add priority column to goals
-- The priority enum type exists but the column was never added
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS priority priority NOT NULL DEFAULT 'medium';

COMMENT ON COLUMN goals.priority IS 'Goal priority level (low, medium, high)';

CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
