CREATE TABLE IF NOT EXISTS resource_areas (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_areas_resource ON resource_areas(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_areas_area ON resource_areas(area_id);

INSERT INTO resource_areas (resource_id, area_id)
SELECT id, area_id
FROM resources
WHERE area_id IS NOT NULL
ON CONFLICT (resource_id, area_id) DO NOTHING;

ALTER TABLE resource_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own resource_areas" ON resource_areas;
CREATE POLICY "Users can only access their own resource_areas" ON resource_areas FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM resources
    WHERE resources.id = resource_areas.resource_id
      AND resources.user_id = auth.uid()
  )
);

--- Update area inactive status to also count resources
CREATE OR REPLACE FUNCTION update_area_inactive_status(target_area_id UUID)
RETURNS VOID AS $$
DECLARE
  activity_count INTEGER;
BEGIN
  IF target_area_id IS NULL THEN
    RETURN;
  END IF;

  SELECT (
    (SELECT count(*)
      FROM (
        SELECT g.id
        FROM goals g
        WHERE g.is_archived = false
          AND (
            g.area_id = target_area_id
            OR EXISTS (
              SELECT 1
              FROM goal_areas ga
              WHERE ga.goal_id = g.id
                AND ga.area_id = target_area_id
            )
          )
      ) active_goals) +
    (SELECT count(*)
      FROM (
        SELECT p.id
        FROM projects p
        WHERE p.is_archived = false
          AND (
            p.area_id = target_area_id
            OR EXISTS (
              SELECT 1
              FROM project_areas pa
              WHERE pa.project_id = p.id
                AND pa.area_id = target_area_id
            )
          )
      ) active_projects) +
    (SELECT count(*) FROM tasks WHERE area_id = target_area_id AND is_archived = false AND is_completed = false) +
    (SELECT count(*)
      FROM (
        SELECT r.id
        FROM resources r
        WHERE r.is_archived = false
          AND (
            r.area_id = target_area_id
            OR EXISTS (
              SELECT 1
              FROM resource_areas ra
              WHERE ra.resource_id = r.id
                AND ra.area_id = target_area_id
            )
          )
      ) active_resources)
  ) INTO activity_count;

  UPDATE areas
  SET inactive = (activity_count = 0)
  WHERE id = target_area_id;
END;
$$ LANGUAGE plpgsql;

--- Trigger for resource_areas junction table changes
CREATE OR REPLACE FUNCTION trigger_area_activity_resource_areas()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_area_inactive_status(NEW.area_id);
    IF TG_OP = 'UPDATE' AND OLD.area_id IS DISTINCT FROM NEW.area_id THEN
      PERFORM update_area_inactive_status(OLD.area_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_area_inactive_status(OLD.area_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS area_activity_resource_areas_trigger ON resource_areas;
CREATE TRIGGER area_activity_resource_areas_trigger
AFTER INSERT OR UPDATE OR DELETE ON resource_areas
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_resource_areas();

--- Trigger for resources table changes (area_id, is_archived)
CREATE OR REPLACE FUNCTION trigger_area_activity_resources()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_area_inactive_status(NEW.area_id);
    IF TG_OP = 'UPDATE' AND OLD.area_id IS DISTINCT FROM NEW.area_id THEN
      PERFORM update_area_inactive_status(OLD.area_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_area_inactive_status(OLD.area_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS area_activity_resources_trigger ON resources;
CREATE TRIGGER area_activity_resources_trigger
AFTER INSERT OR UPDATE OR DELETE ON resources
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_resources();

--- Backfill inactive status for all areas linked to resources
DO $$
DECLARE
  linked_area RECORD;
BEGIN
  FOR linked_area IN SELECT DISTINCT area_id FROM resource_areas LOOP
    PERFORM update_area_inactive_status(linked_area.area_id);
  END LOOP;
END $$;
