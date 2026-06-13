-- Migration: convert resources.project_id (single FK) → resource_projects junction
-- Aligns resources with notes/tasks which already use multi-project junction tables.
-- All current "primary project" rows are backfilled into the junction so existing
-- data is preserved (no information loss).

BEGIN;

-- 1. Create the junction table mirroring note_projects/task_projects shape.
CREATE TABLE resource_projects (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, project_id)
);

ALTER TABLE resource_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_projects_select_own" ON resource_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_projects.resource_id
        AND resources.user_id = auth.uid()
    )
  );

CREATE POLICY "resource_projects_insert_own" ON resource_projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_projects.resource_id
        AND resources.user_id = auth.uid()
    )
  );

CREATE POLICY "resource_projects_update_own" ON resource_projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_projects.resource_id
        AND resources.user_id = auth.uid()
    )
  );

CREATE POLICY "resource_projects_delete_own" ON resource_projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_projects.resource_id
        AND resources.user_id = auth.uid()
    )
  );

CREATE INDEX idx_resource_projects_resource ON resource_projects(resource_id);
CREATE INDEX idx_resource_projects_project  ON resource_projects(project_id);

-- 2. Backfill: every resource with a non-null project_id becomes a junction row.
INSERT INTO resource_projects (resource_id, project_id)
SELECT id, project_id FROM resources WHERE project_id IS NOT NULL
ON CONFLICT (resource_id, project_id) DO NOTHING;

-- 3. Drop the legacy single-FK index (no longer used).
DROP INDEX IF EXISTS idx_resources_project;

-- 4. Rewrite recalc_project_progress() to look up the resource's projects
--    via resource_projects (since resources.project_id no longer exists).
--    Tasks and notes still have direct project_id, so we keep that path.
--    Use to_jsonb(NEW)->>'project_id' so a missing field on resources
--    cleanly returns NULL instead of throwing.
CREATE OR REPLACE FUNCTION recalc_project_progress()
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
               COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
        FROM notes
        WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'
        UNION ALL
        SELECT COUNT(*) AS item_total,
               COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
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

  -- Tasks / notes path (unchanged from prior migration)
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
           COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM notes
    WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'
    UNION ALL
    SELECT COUNT(*) AS item_total,
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

-- 5. Drop the resource trigger that watches project_id, then drop the column.
DROP TRIGGER IF EXISTS on_resource_status_change ON resources;
CREATE TRIGGER on_resource_status_change
AFTER INSERT OR UPDATE OF status, is_archived OR DELETE ON resources
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

-- 6. Drop the legacy FK + column. Data preserved in junction.
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_project_id_fkey;
ALTER TABLE resources DROP COLUMN IF EXISTS project_id;

COMMIT;
