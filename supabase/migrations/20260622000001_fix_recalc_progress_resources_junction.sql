-- Fix recalc_project_progress: the tasks/notes code path still queries
-- `resources.project_id` directly, but resources was migrated to the
-- `resource_projects` junction (20260612000000) and no longer has that column.
--
-- The resources branch of this function was updated to use the junction, but
-- the tasks/notes branch's resources subquery was missed. Result: inserting or
-- updating a task/note WITH a non-null project_id runs that branch, hits the
-- stale `FROM resources WHERE project_id = proj_id` subquery, and the whole
-- statement fails with `42703 column "project_id" does not exist`. The error
-- surfaces on the task INSERT (the trigger fires AFTER INSERT), so it looked
-- like tasks.project_id was missing when the real offender is resources.
--
-- A null project_id never reproduced it: the tasks/notes path early-returns on
-- `proj_id IS NULL` before reaching the bad subquery.
--
-- This rewrites the tasks/notes-path resources subquery to use the junction,
-- matching the already-correct resources branch.

CREATE OR REPLACE FUNCTION public.recalc_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  proj_id UUID;
  total_items INT := 0;
  completed_items INT := 0;
  resource_project_ids UUID[];
  r_proj UUID;
BEGIN
  -- Tasks/notes: take project_id from the row directly.
  -- Resources: pull the project_id list from the junction.
  IF TG_TABLE_NAME = 'resources' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT array_agg(project_id) INTO resource_project_ids
      FROM resource_projects WHERE resource_id = OLD.id;
    ELSE
      SELECT array_agg(project_id) INTO resource_project_ids
      FROM resource_projects WHERE resource_id = NEW.id;
    END IF;
  ELSE
    proj_id := COALESCE(
      (to_jsonb(NEW)->>'project_id')::UUID,
      (to_jsonb(OLD)->>'project_id')::UUID
    );
  END IF;

  -- For resources, recalc each linked project. For other tables, single.
  IF TG_TABLE_NAME = 'resources' THEN
    IF resource_project_ids IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    FOREACH r_proj IN ARRAY resource_project_ids LOOP
      proj_id := r_proj;
      SELECT
        COALESCE(SUM(item_total), 0),
        COALESCE(SUM(item_completed), 0)
      INTO total_items, completed_items
      FROM (
        SELECT COUNT(*) AS item_total,
               COUNT(*) FILTER (WHERE is_completed) AS item_completed
        FROM tasks
        WHERE project_id = proj_id AND is_archived = false
        UNION ALL
        SELECT COUNT(*) AS item_total,
               COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
        FROM notes
        WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'
        UNION ALL
        SELECT COUNT(*) AS item_total,
               COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
        FROM resources
        WHERE id IN (SELECT resource_id FROM resource_projects WHERE project_id = proj_id)
          AND is_archived = false
      ) AS combined;

      UPDATE projects
      SET progress = CASE
        WHEN total_items = 0 THEN 0
        ELSE ROUND((completed_items::numeric / total_items::numeric) * 100)
      END
      WHERE id = proj_id;
    END LOOP;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Tasks / notes path
  IF proj_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(SUM(item_total), 0),
    COALESCE(SUM(item_completed), 0)
  INTO total_items, completed_items
  FROM (
    SELECT COUNT(*) AS item_total,
           COUNT(*) FILTER (WHERE is_completed) AS item_completed
    FROM tasks
    WHERE project_id = proj_id AND is_archived = false
    UNION ALL
    SELECT COUNT(*) AS item_total,
           COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
    FROM notes
    WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'
    UNION ALL
    -- FIXED: resources no longer has project_id; resolve via the junction.
    SELECT COUNT(*) AS item_total,
           COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
    FROM resources
    WHERE id IN (SELECT resource_id FROM resource_projects WHERE project_id = proj_id)
      AND is_archived = false
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
