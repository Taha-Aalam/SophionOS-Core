-- Smart priority calculation function (architecture doc appendix)
-- Inputs: due date, priority level, Eisenhower flags, linked goal count
-- Output: integer 1–5 (1=low urgency, 5=act now)
CREATE OR REPLACE FUNCTION calc_smart_priority(
  p_due_date DATE,
  p_priority priority,
  p_important BOOLEAN,
  p_urgent BOOLEAN,
  p_goal_count INTEGER
) RETURNS SMALLINT AS $$
DECLARE
  score     NUMERIC := 0;
  due_weight  NUMERIC;
  pri_weight  NUMERIC;
  goal_weight NUMERIC;
  eis_weight  NUMERIC;
BEGIN
  -- Due date proximity (30%): 1.5 if overdue, scaled 0–1.5 within 14 days, 0.5 if null
  IF p_due_date IS NULL THEN
    due_weight := 0.5;
  ELSIF p_due_date <= CURRENT_DATE THEN
    due_weight := 1.5;
  ELSE
    due_weight := GREATEST(0, 1.5 - (p_due_date - CURRENT_DATE)::numeric / 14 * 1.5);
  END IF;

  -- Priority level (25%): urgent/high=1.25, medium=0.75, low=0.25
  pri_weight := CASE p_priority
    WHEN 'urgent' THEN 1.25
    WHEN 'high'   THEN 1.25
    WHEN 'medium' THEN 0.75
    WHEN 'low'    THEN 0.25
    ELSE 0.75
  END;

  -- Goal alignment (25%): 0.5 per linked goal, capped at 1.25 (i.e. 3+ goals = max)
  goal_weight := LEAST(1.25, p_goal_count * 0.5);

  -- Eisenhower matrix (20%): both=1.0, important=0.7, urgent=0.5, neither=0
  eis_weight := CASE
    WHEN p_important AND p_urgent THEN 1.0
    WHEN p_important              THEN 0.7
    WHEN p_urgent                 THEN 0.5
    ELSE 0
  END;

  score := due_weight + pri_weight + goal_weight + eis_weight;

  -- Normalize to 1–5 (max possible = 1.5 + 1.25 + 1.25 + 1.0 = 5.0)
  RETURN GREATEST(1, LEAST(5, ROUND(score)));
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function: recalculate smart_priority on every task write
-- goal_count is hardcoded 0 until a task_goals junction table is added
CREATE OR REPLACE FUNCTION set_task_smart_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.smart_priority := calc_smart_priority(
    NEW.due_date,
    NEW.priority,
    NEW.is_important,
    NEW.is_urgent,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_smart_priority
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_smart_priority();
