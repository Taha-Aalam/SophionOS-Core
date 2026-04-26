-- Batch B reconciliation migration for core PARA schema drift.
-- This is intentionally non-destructive: we preserve legacy columns,
-- backfill canonical flags, and align triggers/indexes around the
-- fields the application actually trusts today.

-- Areas: canonical archive/inactive flags.
UPDATE areas
SET archive = COALESCE(archive, is_archived, false)
WHERE archive IS DISTINCT FROM COALESCE(archive, is_archived, false);

ALTER TABLE areas
  ALTER COLUMN archive SET DEFAULT false,
  ALTER COLUMN archive SET NOT NULL,
  ALTER COLUMN inactive SET DEFAULT true,
  ALTER COLUMN inactive SET NOT NULL;

COMMENT ON COLUMN areas.archive IS
  'Canonical archive flag for areas. Legacy areas.is_archived is retained for backward compatibility only.';
COMMENT ON COLUMN areas.inactive IS
  'Canonical activity flag for areas. Managed by update_area_inactive_status().';

-- Goals: canonical completion/archive flags.
UPDATE goals
SET
  is_completed = COALESCE(is_completed, false),
  is_archived = COALESCE(is_archived, false)
WHERE is_completed IS NULL OR is_archived IS NULL;

ALTER TABLE goals
  ALTER COLUMN is_completed SET DEFAULT false,
  ALTER COLUMN is_completed SET NOT NULL,
  ALTER COLUMN is_archived SET DEFAULT false,
  ALTER COLUMN is_archived SET NOT NULL;

-- Projects: archive is a boolean flag, not a workflow status.
UPDATE projects
SET is_archived = true
WHERE status = 'archived' AND is_archived = false;

ALTER TABLE projects
  ALTER COLUMN is_archived SET DEFAULT false,
  ALTER COLUMN is_archived SET NOT NULL;

COMMENT ON COLUMN projects.is_archived IS
  'Canonical archive flag for projects. status remains a workflow field.';

-- Tasks: canonical completion/focus/archive flags.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

UPDATE tasks
SET
  is_completed = COALESCE(is_completed, false),
  is_focused = COALESCE(is_focused, false),
  is_important = COALESCE(is_important, false),
  is_urgent = COALESCE(is_urgent, false),
  is_archived = COALESCE(is_archived, status = 'archived', false)
WHERE
  is_completed IS NULL
  OR is_focused IS NULL
  OR is_important IS NULL
  OR is_urgent IS NULL
  OR is_archived IS NULL
  OR status = 'archived';

UPDATE tasks
SET
  is_completed = true,
  completed_at = COALESCE(completed_at, updated_at, created_at, now())
WHERE status = 'completed' AND is_completed = false;

ALTER TABLE tasks
  ALTER COLUMN is_completed SET DEFAULT false,
  ALTER COLUMN is_completed SET NOT NULL,
  ALTER COLUMN is_focused SET DEFAULT false,
  ALTER COLUMN is_focused SET NOT NULL,
  ALTER COLUMN is_important SET DEFAULT false,
  ALTER COLUMN is_important SET NOT NULL,
  ALTER COLUMN is_urgent SET DEFAULT false,
  ALTER COLUMN is_urgent SET NOT NULL,
  ALTER COLUMN is_archived SET DEFAULT false,
  ALTER COLUMN is_archived SET NOT NULL;

COMMENT ON COLUMN tasks.is_archived IS
  'Canonical archive flag for tasks. status remains a workflow field.';
COMMENT ON COLUMN tasks.is_completed IS
  'Canonical completion flag for tasks. status is not the source of truth for completion.';

-- Replace the original progress trigger with one that follows the canonical flags.
CREATE OR REPLACE FUNCTION recalc_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  target_project_ids UUID[] := ARRAY[]::UUID[];
  target_project_id UUID;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.project_id IS NOT NULL THEN
    target_project_ids := array_append(target_project_ids, NEW.project_id);
  END IF;

  IF TG_OP <> 'INSERT'
     AND OLD.project_id IS NOT NULL
     AND (
       TG_OP = 'DELETE'
       OR OLD.project_id IS DISTINCT FROM NEW.project_id
       OR OLD.is_completed IS DISTINCT FROM NEW.is_completed
       OR COALESCE(OLD.is_archived, false) IS DISTINCT FROM COALESCE(NEW.is_archived, false)
     ) THEN
    target_project_ids := array_append(target_project_ids, OLD.project_id);
  END IF;

  FOREACH target_project_id IN ARRAY target_project_ids LOOP
    WITH task_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE is_archived = false) AS active_tasks,
        COUNT(*) FILTER (WHERE is_archived = false AND is_completed = true) AS completed_tasks
      FROM tasks
      WHERE project_id = target_project_id
    )
    UPDATE projects
    SET progress = CASE
      WHEN task_counts.active_tasks = 0 THEN 0
      ELSE ROUND((task_counts.completed_tasks::numeric / task_counts.active_tasks::numeric) * 100, 2)
    END
    FROM task_counts
    WHERE projects.id = target_project_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_task_completed ON tasks;
CREATE TRIGGER on_task_completed
AFTER INSERT OR UPDATE OF is_completed, is_archived, project_id OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION recalc_project_progress();

-- Add indexes for the canonical archive flags used by services.
CREATE INDEX IF NOT EXISTS idx_areas_user_archive ON areas(user_id, archive);
CREATE INDEX IF NOT EXISTS idx_goals_user_archived ON goals(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_user_archived ON projects(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_tasks_user_archived ON tasks(user_id, is_archived);
