-- Migration: Add area inactive/archived status with auto-inactive triggers
-- Areas table: add inactive + archive columns
ALTER TABLE areas
ADD COLUMN IF NOT EXISTS inactive BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS archive BOOLEAN NOT NULL DEFAULT false;

-- Function to recalculate area inactive status
-- An area is inactive when it has 0 active linked goals + projects + tasks
CREATE OR REPLACE FUNCTION update_area_inactive_status(target_area_id UUID)
RETURNS VOID AS $$
DECLARE
  activity_count INTEGER;
BEGIN
  SELECT (
    (SELECT count(*) FROM goals WHERE area_id = target_area_id AND is_archived = false) +
    (SELECT count(*) FROM projects WHERE area_id = target_area_id AND is_archived = false) +
    (SELECT count(*) FROM tasks WHERE area_id = target_area_id AND is_archived = false AND is_completed = false)
  ) INTO activity_count;

  UPDATE areas
  SET inactive = (activity_count = 0)
  WHERE id = target_area_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Goals
CREATE OR REPLACE FUNCTION trigger_area_activity_goals()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_area_inactive_status(NEW.area_id);
    IF (TG_OP = 'UPDATE' AND OLD.area_id IS DISTINCT FROM NEW.area_id) THEN
      PERFORM update_area_inactive_status(OLD.area_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_area_inactive_status(OLD.area_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS area_activity_goals_trigger ON goals;
CREATE TRIGGER area_activity_goals_trigger
AFTER INSERT OR UPDATE OR DELETE ON goals
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_goals();

-- Triggers for Projects
CREATE OR REPLACE FUNCTION trigger_area_activity_projects()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_area_inactive_status(NEW.area_id);
    IF (TG_OP = 'UPDATE' AND OLD.area_id IS DISTINCT FROM NEW.area_id) THEN
      PERFORM update_area_inactive_status(OLD.area_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_area_inactive_status(OLD.area_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS area_activity_projects_trigger ON projects;
CREATE TRIGGER area_activity_projects_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_projects();

-- Triggers for Tasks
CREATE OR REPLACE FUNCTION trigger_area_activity_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_area_inactive_status(NEW.area_id);
    IF (TG_OP = 'UPDATE' AND OLD.area_id IS DISTINCT FROM NEW.area_id) THEN
      PERFORM update_area_inactive_status(OLD.area_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_area_inactive_status(OLD.area_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS area_activity_tasks_trigger ON tasks;
CREATE TRIGGER area_activity_tasks_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_tasks();