-- Fix two compounding bugs in DB progress recalculation:
--
-- 1) recalc_project_progress only counted tasks. Notes and resources linked to
--    the project were ignored, so a project with 1 completed task + 1 note + 1
--    resource was stored as progress=100 instead of 33.
--
-- 2) recalc_goal_progress auto-flipped goals.is_completed = true whenever the
--    computed average hit 100. Combined with bug #1 this silently marked goals
--    as completed when a single task was ticked off. Goal completion is now
--    user-controlled only; this function updates progress and never touches
--    is_completed.

CREATE OR REPLACE FUNCTION recalc_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  proj_id UUID;
  total_items INT := 0;
  completed_items INT := 0;
BEGIN
  proj_id := COALESCE(NEW.project_id, OLD.project_id);

  IF proj_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(SUM(item_total), 0),
    COALESCE(SUM(item_completed), 0)
  INTO total_items, completed_items
  FROM (
    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE is_completed) AS item_completed
    FROM tasks
    WHERE project_id = proj_id AND is_archived = false

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM notes
    WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM resources
    WHERE project_id = proj_id AND is_archived = false
  ) AS combined;

  UPDATE projects
  SET progress = CASE
    WHEN total_items = 0 THEN 0
    ELSE ROUND((completed_items::numeric / total_items::numeric) * 100)
  END
  WHERE id = proj_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Re-fire on notes and resources too, not just tasks
DROP TRIGGER IF EXISTS on_task_completed ON tasks;
CREATE TRIGGER on_task_completed
AFTER INSERT OR UPDATE OF is_completed, is_archived, project_id OR DELETE ON tasks
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

DROP TRIGGER IF EXISTS on_note_status_change ON notes;
CREATE TRIGGER on_note_status_change
AFTER INSERT OR UPDATE OF status, is_archived, project_id OR DELETE ON notes
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

DROP TRIGGER IF EXISTS on_resource_status_change ON resources;
CREATE TRIGGER on_resource_status_change
AFTER INSERT OR UPDATE OF status, is_archived, project_id OR DELETE ON resources
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

CREATE OR REPLACE FUNCTION recalc_goal_progress(target_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  linked_items INTEGER := 0;
  average_progress NUMERIC := 0;
BEGIN
  WITH linked_progress AS (
    SELECT p.progress::numeric AS progress
    FROM goal_projects gp
    JOIN projects p ON p.id = gp.project_id
    WHERE gp.goal_id = target_goal_id
      AND p.is_archived = false

    UNION ALL

    SELECT CASE WHEN t.is_completed THEN 100::numeric ELSE 0::numeric END AS progress
    FROM goal_tasks gt
    JOIN tasks t ON t.id = gt.task_id
    WHERE gt.goal_id = target_goal_id
      AND t.is_archived = false
      AND NOT EXISTS (
        SELECT 1
        FROM goal_projects gp
        WHERE gp.goal_id = target_goal_id
          AND gp.project_id = t.project_id
      )
  )
  SELECT COUNT(*), COALESCE(ROUND(AVG(progress), 2), 0)
  INTO linked_items, average_progress
  FROM linked_progress;

  UPDATE goals
  SET progress = CASE
    WHEN linked_items = 0 THEN 0
    ELSE average_progress
  END
  WHERE id = target_goal_id;
END;
$$ LANGUAGE plpgsql;

-- Backfill: recompute progress for every project so any DB rows still stuck at
-- the old (task-only) value get corrected.
UPDATE projects pr
SET progress = sub.progress
FROM (
  SELECT
    proj.id AS project_id,
    CASE
      WHEN COALESCE(SUM(item_total), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(item_completed), 0)::numeric / SUM(item_total)::numeric) * 100)
    END AS progress
  FROM projects proj
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE is_completed) AS item_completed
    FROM tasks
    WHERE project_id = proj.id AND is_archived = false

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM notes
    WHERE project_id = proj.id AND is_archived = false AND status <> 'archive'

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM resources
    WHERE project_id = proj.id AND is_archived = false
  ) AS combined ON TRUE
  GROUP BY proj.id
) AS sub
WHERE pr.id = sub.project_id;

-- Recompute goal.progress for every non-archived goal (is_completed left
-- untouched, so anything stuck completed-by-bug must be unchecked by the user).
DO $$
DECLARE
  g RECORD;
BEGIN
  FOR g IN SELECT id FROM goals WHERE is_archived = false LOOP
    PERFORM recalc_goal_progress(g.id);
  END LOOP;
END;
$$;
