-- Add project alignment to calc_smart_priority()
-- Projects add 0.25 per project, capped at 0.75 (weaker than goals' 0.5 each)
-- Combined alignment cap remains 1.25

DROP TRIGGER IF EXISTS trg_tasks_smart_priority ON tasks;
DROP FUNCTION IF EXISTS set_task_smart_priority();

CREATE OR REPLACE FUNCTION calc_smart_priority(
  p_due_date DATE,
  p_priority priority,
  p_important BOOLEAN,
  p_urgent BOOLEAN,
  p_goal_count INTEGER,
  p_project_count INTEGER
) RETURNS SMALLINT AS $$
DECLARE
  score             NUMERIC := 0;
  due_weight        NUMERIC;
  pri_weight        NUMERIC;
  goal_weight       NUMERIC;
  project_weight    NUMERIC;
  alignment_weight  NUMERIC;
  eis_weight        NUMERIC;
BEGIN
  -- Due date proximity (30%): 1.5 if overdue, scaled 0–1.5 within 14 days, 0.5 if null
  IF p_due_date IS NULL THEN
    due_weight := 0.5;
  ELSIF p_due_date <= CURRENT_DATE THEN
    due_weight := 1.5;
  ELSE
    due_weight := GREATEST(0, 1.5 - (p_due_date - CURRENT_DATE)::numeric / 14 * 1.5);
  END IF;

  -- Priority level (25%): high=1.25, medium=0.75, low=0.25
  pri_weight := CASE p_priority
    WHEN 'high'   THEN 1.25
    WHEN 'medium' THEN 0.75
    WHEN 'low'    THEN 0.25
    ELSE 0.75
  END;

  -- Goal + Project alignment (25% combined budget)
  goal_weight      := LEAST(1.25, p_goal_count * 0.5);
  project_weight   := LEAST(0.75, p_project_count * 0.25);
  alignment_weight := LEAST(1.25, goal_weight + project_weight);

  -- Eisenhower matrix (20%): both=1.0, important=0.7, urgent=0.5, neither=0
  eis_weight := CASE
    WHEN p_important AND p_urgent THEN 1.0
    WHEN p_important              THEN 0.7
    WHEN p_urgent                 THEN 0.5
    ELSE 0
  END;

  score := due_weight + pri_weight + alignment_weight + eis_weight;

  -- Normalize to 1–5 (max possible = 1.5 + 1.25 + 1.25 + 1.0 = 5.0)
  RETURN GREATEST(1, LEAST(5, ROUND(score)));
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function: counts goals from task_goals (if it exists) and projects from task_projects.
-- task_goals junction does not exist yet, so goal_count is hardcoded to 0.
-- TODO: wire v_goal_count to task_goals when that junction table is added.
CREATE OR REPLACE FUNCTION set_task_smart_priority()
RETURNS TRIGGER AS $$
DECLARE
  v_project_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_project_count
  FROM task_projects
  WHERE task_id = NEW.id;

  NEW.smart_priority := calc_smart_priority(
    NEW.due_date,
    NEW.priority,
    NEW.is_important,
    NEW.is_urgent,
    0,                       -- v_goal_count: task_goals junction not yet present
    v_project_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_smart_priority
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_smart_priority();
