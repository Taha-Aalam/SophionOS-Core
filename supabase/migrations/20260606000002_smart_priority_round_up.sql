-- Round up any raw score >= 4.1 to 5 in calc_smart_priority()
-- Catches the "strong 4" cluster that was feeling under-ranked.
-- Matches client mirror in src/lib/utils/smart-priority.ts.

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
  clamped           NUMERIC;
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

  -- Round up raw scores >= 4.1 to 5
  clamped := GREATEST(1, LEAST(5, score));
  IF clamped >= 4.1 THEN
    RETURN 5;
  ELSE
    RETURN ROUND(clamped);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
