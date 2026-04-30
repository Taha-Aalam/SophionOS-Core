CREATE TABLE IF NOT EXISTS goal_areas (
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_areas_goal ON goal_areas(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_areas_area ON goal_areas(area_id);

INSERT INTO goal_areas (goal_id, area_id)
SELECT id, area_id
FROM goals
WHERE area_id IS NOT NULL
ON CONFLICT (goal_id, area_id) DO NOTHING;

ALTER TABLE goal_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own goal_areas" ON goal_areas;
CREATE POLICY "Users can only access their own goal_areas" ON goal_areas FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM goals
    WHERE goals.id = goal_areas.goal_id
      AND goals.user_id = auth.uid()
  )
);

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
    (SELECT count(*) FROM projects WHERE area_id = target_area_id AND is_archived = false) +
    (SELECT count(*) FROM tasks WHERE area_id = target_area_id AND is_archived = false AND is_completed = false)
  ) INTO activity_count;

  UPDATE areas
  SET inactive = (activity_count = 0)
  WHERE id = target_area_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_area_activity_goal_areas()
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

DROP TRIGGER IF EXISTS area_activity_goal_areas_trigger ON goal_areas;
CREATE TRIGGER area_activity_goal_areas_trigger
AFTER INSERT OR UPDATE OR DELETE ON goal_areas
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_goal_areas();

DO $$
DECLARE
  linked_area RECORD;
BEGIN
  FOR linked_area IN SELECT DISTINCT area_id FROM goal_areas LOOP
    PERFORM update_area_inactive_status(linked_area.area_id);
  END LOOP;
END $$;
