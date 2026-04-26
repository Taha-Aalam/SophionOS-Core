-- Recalculate project progress trigger
CREATE OR REPLACE FUNCTION recalc_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INT;
  completed_tasks INT;
  proj_id UUID;
BEGIN
  proj_id := NEW.project_id;

  IF proj_id IS NOT NULL THEN
    SELECT count(*) INTO total_tasks FROM tasks WHERE project_id = proj_id;
    SELECT count(*) INTO completed_tasks FROM tasks WHERE project_id = proj_id AND is_completed = true;

    UPDATE projects
    SET progress = CASE WHEN total_tasks = 0 THEN 0 ELSE (completed_tasks::numeric / total_tasks::numeric) * 100 END
    WHERE id = proj_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_task_completed AFTER INSERT OR UPDATE OF is_completed ON tasks
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();
