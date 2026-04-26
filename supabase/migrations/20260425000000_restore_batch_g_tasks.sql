-- Batch G restoration: task-goal smart priority and downstream goal progress.

CREATE OR REPLACE FUNCTION set_task_smart_priority()
RETURNS TRIGGER AS $$
DECLARE
  linked_goal_count INTEGER := 0;
BEGIN
  SELECT COUNT(*)
  INTO linked_goal_count
  FROM goal_tasks gt
  JOIN goals g ON g.id = gt.goal_id
  WHERE gt.task_id = NEW.id
    AND g.is_archived = false;

  NEW.smart_priority := calc_smart_priority(
    NEW.due_date,
    NEW.priority,
    NEW.is_important,
    NEW.is_urgent,
    linked_goal_count
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_task_smart_priority_from_goal_links()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET updated_at = now()
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goal_tasks_refresh_task_priority ON goal_tasks;
CREATE TRIGGER trg_goal_tasks_refresh_task_priority
AFTER INSERT OR UPDATE OR DELETE ON goal_tasks
FOR EACH ROW
EXECUTE FUNCTION refresh_task_smart_priority_from_goal_links();

CREATE OR REPLACE FUNCTION refresh_task_smart_priority_from_goal_state()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(OLD.is_archived, false) IS DISTINCT FROM COALESCE(NEW.is_archived, false) THEN
    UPDATE tasks
    SET updated_at = now()
    WHERE id IN (
      SELECT task_id
      FROM goal_tasks
      WHERE goal_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goals_refresh_task_priority ON goals;
CREATE TRIGGER trg_goals_refresh_task_priority
AFTER UPDATE OF is_archived ON goals
FOR EACH ROW
EXECUTE FUNCTION refresh_task_smart_priority_from_goal_state();

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
  SET
    progress = CASE
      WHEN linked_items = 0 THEN 0
      ELSE average_progress
    END,
    is_completed = CASE
      WHEN linked_items = 0 THEN false
      ELSE average_progress >= 100
    END
  WHERE id = target_goal_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_goal_progress_from_goal_projects()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN
    PERFORM recalc_goal_progress(NEW.goal_id);
  END IF;

  IF TG_OP <> 'INSERT' AND OLD.goal_id IS DISTINCT FROM COALESCE(NEW.goal_id, OLD.goal_id) THEN
    PERFORM recalc_goal_progress(OLD.goal_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_goal_progress(OLD.goal_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goal_projects_recalc_progress ON goal_projects;
CREATE TRIGGER trg_goal_projects_recalc_progress
AFTER INSERT OR UPDATE OR DELETE ON goal_projects
FOR EACH ROW
EXECUTE FUNCTION trigger_goal_progress_from_goal_projects();

CREATE OR REPLACE FUNCTION trigger_goal_progress_from_goal_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN
    PERFORM recalc_goal_progress(NEW.goal_id);
  END IF;

  IF TG_OP <> 'INSERT' AND OLD.goal_id IS DISTINCT FROM COALESCE(NEW.goal_id, OLD.goal_id) THEN
    PERFORM recalc_goal_progress(OLD.goal_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_goal_progress(OLD.goal_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goal_tasks_recalc_progress ON goal_tasks;
CREATE TRIGGER trg_goal_tasks_recalc_progress
AFTER INSERT OR UPDATE OR DELETE ON goal_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_goal_progress_from_goal_tasks();

CREATE OR REPLACE FUNCTION trigger_goal_progress_from_projects()
RETURNS TRIGGER AS $$
DECLARE
  target_goal_id UUID;
BEGIN
  FOR target_goal_id IN
    SELECT goal_id
    FROM goal_projects
    WHERE project_id = COALESCE(NEW.id, OLD.id)
  LOOP
    PERFORM recalc_goal_progress(target_goal_id);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_recalc_goal_progress ON projects;
CREATE TRIGGER trg_projects_recalc_goal_progress
AFTER INSERT OR UPDATE OF progress, is_archived OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION trigger_goal_progress_from_projects();

CREATE OR REPLACE FUNCTION trigger_goal_progress_from_tasks()
RETURNS TRIGGER AS $$
DECLARE
  target_goal_id UUID;
BEGIN
  FOR target_goal_id IN
    SELECT goal_id
    FROM goal_tasks
    WHERE task_id = COALESCE(NEW.id, OLD.id)
  LOOP
    PERFORM recalc_goal_progress(target_goal_id);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_recalc_goal_progress ON tasks;
CREATE TRIGGER trg_tasks_recalc_goal_progress
AFTER INSERT OR UPDATE OF is_completed, is_archived OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_goal_progress_from_tasks();
