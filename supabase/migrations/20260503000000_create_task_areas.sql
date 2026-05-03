CREATE TABLE IF NOT EXISTS task_areas (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_task_areas_task ON task_areas(task_id);
CREATE INDEX IF NOT EXISTS idx_task_areas_area ON task_areas(area_id);

INSERT INTO task_areas (task_id, area_id)
SELECT id, area_id
FROM tasks
WHERE area_id IS NOT NULL
ON CONFLICT (task_id, area_id) DO NOTHING;

ALTER TABLE task_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own task_areas" ON task_areas;
CREATE POLICY "Users can only access their own task_areas" ON task_areas FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM tasks
    WHERE tasks.id = task_areas.task_id
      AND tasks.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION trigger_area_activity_task_areas()
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

DROP TRIGGER IF EXISTS area_activity_task_areas_trigger ON task_areas;
CREATE TRIGGER area_activity_task_areas_trigger
AFTER INSERT OR UPDATE OR DELETE ON task_areas
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_task_areas();

DO $$
DECLARE
  linked_area RECORD;
BEGIN
  FOR linked_area IN SELECT DISTINCT area_id FROM task_areas LOOP
    PERFORM update_area_inactive_status(linked_area.area_id);
  END LOOP;
END $$;
