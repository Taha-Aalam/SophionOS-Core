-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- Enums for core entities
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('inbox', 'todo', 'in_progress', 'completed', 'archived');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'on_hold', 'archived');
CREATE TYPE goal_term AS ENUM ('short', 'mid', 'long');
CREATE TYPE area_type AS ENUM ('personal', 'professional', 'health', 'finance', 'growth', 'system');
-- Areas table
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  type area_type DEFAULT 'personal',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_areas_user_id ON areas(user_id);
-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  term goal_term NOT NULL,
  priority priority DEFAULT 'medium',
  target_date DATE,
  progress NUMERIC(5, 2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_area_id ON goals(area_id);
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'planning',
  priority priority DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  progress NUMERIC(5, 2) DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_area_id ON projects(area_id);
-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'inbox',
  priority priority DEFAULT 'medium',
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  is_focused BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  smart_priority INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_area_id ON tasks(area_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
-- Junction tables for Many-to-Many relationships
CREATE TABLE goal_projects (
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, project_id)
);

CREATE TABLE goal_tasks (
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, task_id)
);
-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
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
-- Core indexes for performance
CREATE INDEX idx_tasks_user_status_priority ON tasks(user_id, status, priority);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_goals_user_term ON goals(user_id, term);
CREATE INDEX idx_areas_user_archived ON areas(user_id, is_archived);
-- RLS Policies
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own areas" ON areas FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goals" ON goals FOR ALL USING (auth.uid() = user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own projects" ON projects FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goal_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goal_projects" ON goal_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid())
);

ALTER TABLE goal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goal_tasks" ON goal_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid())
);
-- Smart priority calculation function (architecture doc appendix)
-- Inputs: due date, priority level, Eisenhower flags, linked goal count
-- Output: integer 1â€“5 (1=low urgency, 5=act now)
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
  -- Due date proximity (30%): 1.5 if overdue, scaled 0â€“1.5 within 14 days, 0.5 if null
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

  -- Normalize to 1â€“5 (max possible = 1.5 + 1.25 + 1.25 + 1.0 = 5.0)
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
-- Add slug column to areas table
ALTER TABLE areas ADD COLUMN slug TEXT UNIQUE;

-- Generate slugs from existing area names (lowercase, replace spaces with hyphens, remove special chars)
UPDATE areas SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'));
UPDATE areas SET slug = lower(regexp_replace(name, '\s+', '-', 'g'));

-- Make slug column required
ALTER TABLE areas ALTER COLUMN slug SET NOT NULL;

-- Create index on slug for faster lookups
CREATE INDEX idx_areas_slug ON areas(slug);
-- Expand area types from enum to text to allow custom types
-- Step 1: Change the type column from enum to text with default
ALTER TABLE areas
ALTER COLUMN type TYPE text,
ALTER COLUMN type SET DEFAULT 'personal',
ALTER COLUMN type SET NOT NULL;

-- Step 2: Create index for grouped queries by type
CREATE INDEX IF NOT EXISTS idx_areas_user_type ON areas(user_id, type);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN areas.type IS 'User-defined area type. Default types: Business, Personal, Studies';
-- No-op: previous version of this migration incorrectly changed inactive DEFAULT to false.
-- The original DEFAULT true from 20260421000000_area_status_fields.sql is correct:
-- new areas start inactive and become active only once goals/projects/tasks are linked.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
-- Batch B reconciliation migration for core PARA schema drift.
-- This is intentionally non-destructive: we preserve legacy columns,
-- backfill canonical flags, and align triggers/indexes around the
-- fields the application actually trusts today.

-- Areas: canonical archive/inactive flags.
UPDATE areas
SET archive = COALESCE(archive, is_archived, false)
WHERE archive IS DISTINCT FROM COALESCE(archive, is_archived, false);

ALTER TABLE areas
  ALTER COLUMN archive SET DEFAULT false,
  ALTER COLUMN archive SET NOT NULL,
  ALTER COLUMN inactive SET DEFAULT true,
  ALTER COLUMN inactive SET NOT NULL;

COMMENT ON COLUMN areas.archive IS
  'Canonical archive flag for areas. Legacy areas.is_archived is retained for backward compatibility only.';
COMMENT ON COLUMN areas.inactive IS
  'Canonical activity flag for areas. Managed by update_area_inactive_status().';

-- Goals: canonical completion/archive flags.
UPDATE goals
SET
  is_completed = COALESCE(is_completed, false),
  is_archived = COALESCE(is_archived, false)
WHERE is_completed IS NULL OR is_archived IS NULL;

ALTER TABLE goals
  ALTER COLUMN is_completed SET DEFAULT false,
  ALTER COLUMN is_completed SET NOT NULL,
  ALTER COLUMN is_archived SET DEFAULT false,
  ALTER COLUMN is_archived SET NOT NULL;

-- Projects: archive is a boolean flag, not a workflow status.
UPDATE projects
SET is_archived = true
WHERE status = 'archived' AND is_archived = false;

ALTER TABLE projects
  ALTER COLUMN is_archived SET DEFAULT false,
  ALTER COLUMN is_archived SET NOT NULL;

COMMENT ON COLUMN projects.is_archived IS
  'Canonical archive flag for projects. status remains a workflow field.';

-- Tasks: canonical completion/focus/archive flags.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

UPDATE tasks
SET
  is_completed = COALESCE(is_completed, false),
  is_focused = COALESCE(is_focused, false),
  is_important = COALESCE(is_important, false),
  is_urgent = COALESCE(is_urgent, false),
  is_archived = COALESCE(is_archived, status = 'archived', false)
WHERE
  is_completed IS NULL
  OR is_focused IS NULL
  OR is_important IS NULL
  OR is_urgent IS NULL
  OR is_archived IS NULL
  OR status = 'archived';

UPDATE tasks
SET
  is_completed = true,
  completed_at = COALESCE(completed_at, updated_at, created_at, now())
WHERE status = 'completed' AND is_completed = false;

ALTER TABLE tasks
  ALTER COLUMN is_completed SET DEFAULT false,
  ALTER COLUMN is_completed SET NOT NULL,
  ALTER COLUMN is_focused SET DEFAULT false,
  ALTER COLUMN is_focused SET NOT NULL,
  ALTER COLUMN is_important SET DEFAULT false,
  ALTER COLUMN is_important SET NOT NULL,
  ALTER COLUMN is_urgent SET DEFAULT false,
  ALTER COLUMN is_urgent SET NOT NULL,
  ALTER COLUMN is_archived SET DEFAULT false,
  ALTER COLUMN is_archived SET NOT NULL;

COMMENT ON COLUMN tasks.is_archived IS
  'Canonical archive flag for tasks. status remains a workflow field.';
COMMENT ON COLUMN tasks.is_completed IS
  'Canonical completion flag for tasks. status is not the source of truth for completion.';

-- Replace the original progress trigger with one that follows the canonical flags.
CREATE OR REPLACE FUNCTION recalc_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  target_project_ids UUID[] := ARRAY[]::UUID[];
  target_project_id UUID;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.project_id IS NOT NULL THEN
    target_project_ids := array_append(target_project_ids, NEW.project_id);
  END IF;

  IF TG_OP <> 'INSERT'
     AND OLD.project_id IS NOT NULL
     AND (
       TG_OP = 'DELETE'
       OR OLD.project_id IS DISTINCT FROM NEW.project_id
       OR OLD.is_completed IS DISTINCT FROM NEW.is_completed
       OR COALESCE(OLD.is_archived, false) IS DISTINCT FROM COALESCE(NEW.is_archived, false)
     ) THEN
    target_project_ids := array_append(target_project_ids, OLD.project_id);
  END IF;

  FOREACH target_project_id IN ARRAY target_project_ids LOOP
    WITH task_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE is_archived = false) AS active_tasks,
        COUNT(*) FILTER (WHERE is_archived = false AND is_completed = true) AS completed_tasks
      FROM tasks
      WHERE project_id = target_project_id
    )
    UPDATE projects
    SET progress = CASE
      WHEN task_counts.active_tasks = 0 THEN 0
      ELSE ROUND((task_counts.completed_tasks::numeric / task_counts.active_tasks::numeric) * 100, 2)
    END
    FROM task_counts
    WHERE projects.id = target_project_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_task_completed ON tasks;
CREATE TRIGGER on_task_completed
AFTER INSERT OR UPDATE OF is_completed, is_archived, project_id OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION recalc_project_progress();

-- Add indexes for the canonical archive flags used by services.
CREATE INDEX IF NOT EXISTS idx_areas_user_archive ON areas(user_id, archive);
CREATE INDEX IF NOT EXISTS idx_goals_user_archived ON goals(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_user_archived ON projects(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_tasks_user_archived ON tasks(user_id, is_archived);
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
-- Step 15: Notes table with note_type and note_status enums.
-- Uses is_archived (consistent with goals/projects/tasks, not areas).

CREATE TYPE note_type AS ENUM ('note', 'research', 'journal');
CREATE TYPE note_status AS ENUM ('inbox', 'to_review', 'active', 'archive');

CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  content     TEXT,
  type        note_type NOT NULL DEFAULT 'note',
  status      note_status NOT NULL DEFAULT 'inbox',
  notebook    TEXT,
  favorite    BOOLEAN NOT NULL DEFAULT false,
  pin         BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_own" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_own" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_notes_updated
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_notes_user ON notes(user_id) WHERE NOT is_archived;
CREATE INDEX idx_notes_user_status ON notes(user_id, status) WHERE NOT is_archived;
CREATE INDEX idx_notes_area ON notes(area_id) WHERE NOT is_archived AND area_id IS NOT NULL;
CREATE INDEX idx_notes_project ON notes(project_id) WHERE NOT is_archived AND project_id IS NOT NULL;
CREATE INDEX idx_notes_favorite ON notes(user_id) WHERE favorite = true AND NOT is_archived;
CREATE INDEX idx_notes_search ON notes USING gin(
  to_tsvector('english', name || ' ' || COALESCE(content, ''))
);
-- Step 17: Resources table + minimal topics table (Step 18 will expand)
-- Topics created here to satisfy FK constraint for resources.topic_id

CREATE TYPE resource_status AS ENUM ('inbox', 'to_review', 'active');
CREATE TYPE resource_type AS ENUM ('website', 'article', 'video', 'document', 'podcast', 'social_media', 'tool');

-- Minimal topics table (expanded in Step 18)
CREATE TABLE topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  favorite    BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_select_own" ON topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "topics_insert_own" ON topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "topics_update_own" ON topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "topics_delete_own" ON topics FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_topics_updated
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_topics_user ON topics(user_id);
CREATE INDEX idx_topics_area ON topics(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_topics_user_favorite ON topics(user_id) WHERE favorite = true;

-- Resources table
CREATE TABLE resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  topic_id    UUID REFERENCES topics(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  url         TEXT,
  type        resource_type NOT NULL DEFAULT 'website',
  status      resource_status NOT NULL DEFAULT 'inbox',
  favorite    BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_select_own" ON resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "resources_insert_own" ON resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resources_update_own" ON resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "resources_delete_own" ON resources FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_resources_updated
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_resources_user ON resources(user_id) WHERE NOT is_archived;
CREATE INDEX idx_resources_user_status ON resources(user_id, status) WHERE NOT is_archived;
CREATE INDEX idx_resources_area ON resources(area_id) WHERE NOT is_archived AND area_id IS NOT NULL;
CREATE INDEX idx_resources_project ON resources(project_id) WHERE NOT is_archived AND project_id IS NOT NULL;
CREATE INDEX idx_resources_topic ON resources(topic_id) WHERE NOT is_archived AND topic_id IS NOT NULL;
CREATE INDEX idx_resources_favorite ON resources(user_id) WHERE favorite = true AND NOT is_archived;
CREATE INDEX idx_resources_search ON resources USING gin(
  to_tsvector('english', name || ' ' || COALESCE(url, ''))
);
-- Step 18: Topics full CRUD
-- 1. Junction table for many-to-many topic â†” area linking
-- 2. Add inactive column to topics
-- 3. Add topic_id to notes
-- 4. recalc_topic_inactive() trigger function

-- Junction table: topic can belong to multiple areas
CREATE TABLE topic_areas (
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  area_id   UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, area_id)
);

CREATE INDEX idx_topic_areas_topic ON topic_areas(topic_id);
CREATE INDEX idx_topic_areas_area  ON topic_areas(area_id);

-- Add inactive column to topics
ALTER TABLE topics ADD COLUMN IF NOT EXISTS inactive BOOLEAN NOT NULL DEFAULT true;

-- Add topic_id to notes (notes can link to topics)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_topic ON notes(topic_id) WHERE topic_id IS NOT NULL AND NOT is_archived;

-- Function to recalculate topic inactive status
-- A topic is inactive when it has 0 linked notes + 0 linked resources
CREATE OR REPLACE FUNCTION update_topic_inactive_status(target_topic_id UUID)
RETURNS VOID AS $$
DECLARE
  activity_count INTEGER;
BEGIN
  SELECT (
    (SELECT count(*) FROM notes WHERE topic_id = target_topic_id AND is_archived = false) +
    (SELECT count(*) FROM resources WHERE topic_id = target_topic_id AND is_archived = false)
  ) INTO activity_count;

  UPDATE topics
  SET inactive = (activity_count = 0)
  WHERE id = target_topic_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Notes (on topic_id change)
CREATE OR REPLACE FUNCTION trigger_topic_activity_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_topic_inactive_status(NEW.topic_id);
    IF (TG_OP = 'UPDATE' AND OLD.topic_id IS DISTINCT FROM NEW.topic_id) THEN
      PERFORM update_topic_inactive_status(OLD.topic_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_topic_inactive_status(OLD.topic_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topic_activity_notes_trigger ON notes;
CREATE TRIGGER topic_activity_notes_trigger
AFTER INSERT OR UPDATE OR DELETE ON notes
FOR EACH ROW EXECUTE FUNCTION trigger_topic_activity_notes();

-- Triggers for Resources (on topic_id change)
CREATE OR REPLACE FUNCTION trigger_topic_activity_resources()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM update_topic_inactive_status(NEW.topic_id);
    IF (TG_OP = 'UPDATE' AND OLD.topic_id IS DISTINCT FROM NEW.topic_id) THEN
      PERFORM update_topic_inactive_status(OLD.topic_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_topic_inactive_status(OLD.topic_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topic_activity_resources_trigger ON resources;
CREATE TRIGGER topic_activity_resources_trigger
AFTER INSERT OR UPDATE OR DELETE ON resources
FOR EACH ROW EXECUTE FUNCTION trigger_topic_activity_resources();
-- Step 19: Contacts module
-- Professional Network & Stakeholder Tracker

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text,
  organization text,
  "group" text,
  phone text,
  email text,
  linkedin text,
  website text,
  last_interaction_at timestamptz,
  follow_up_interval_days int default 14,
  favorite boolean default false,
  notes text,
  archive boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contact_projects (
  contact_id uuid not null references contacts(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  role_in_project text,
  primary key (contact_id, project_id)
);

create table if not exists contact_tasks (
  contact_id uuid not null references contacts(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  role_in_task text,
  primary key (contact_id, task_id)
);

create index if not exists contacts_user_id_idx on contacts(user_id);
create index if not exists contacts_group_idx on contacts(user_id, "group");
create index if not exists contact_projects_project_idx on contact_projects(project_id);
create index if not exists contact_tasks_task_idx on contact_tasks(task_id);

create or replace function update_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_contacts_updated_at();

-- RLS
alter table contacts enable row level security;

create policy "Users can manage own contacts"
  on contacts for all
  using (auth.uid() = user_id);

create policy "Users can manage own contact_project links"
  on contact_projects for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_projects.contact_id
      and contacts.user_id = auth.uid()
    )
  );

create policy "Users can manage own contact_task links"
  on contact_tasks for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_tasks.contact_id
      and contacts.user_id = auth.uid()
    )
  );
-- Step 20: Goal detail page â€” resource-to-goal linkage
-- Junction table to link resources to goals (powers goal-scoped Resources section)

CREATE TABLE goal_resources (
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, resource_id)
);

ALTER TABLE goal_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_resources_select_own" ON goal_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_resources.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_resources_insert_own" ON goal_resources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_resources.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_resources_delete_own" ON goal_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_resources.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_goal_resources_goal ON goal_resources(goal_id);
CREATE INDEX idx_goal_resources_resource ON goal_resources(resource_id);
-- Step 20: Goal detail page â€” note-to-goal linkage
-- Junction table to link notes to goals (powers goal-scoped Notes section)

CREATE TABLE goal_notes (
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, note_id)
);

ALTER TABLE goal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_notes_select_own" ON goal_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_notes.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_notes_insert_own" ON goal_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_notes.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_notes_delete_own" ON goal_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_notes.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_goal_notes_goal ON goal_notes(goal_id);
CREATE INDEX idx_goal_notes_note ON goal_notes(note_id);
-- Add slug column to goals table
ALTER TABLE goals ADD COLUMN slug TEXT;

-- Generate slugs from existing goal names
UPDATE goals SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'));
UPDATE goals SET slug = lower(regexp_replace(slug, '\s+', '-', 'g'));

-- Allow null temporarily then make non-null once all are populated
ALTER TABLE goals ALTER COLUMN slug SET NOT NULL;

-- Create index on slug for faster lookups
CREATE INDEX idx_goals_slug ON goals(slug);
-- Backfill slugs for goals that have null/empty slugs
-- and ensure slug uniqueness per user using a unique index + trigger

-- Step 1: Backfill null slugs (created between migration and now)
UPDATE goals
SET slug = base_slug
FROM (
  SELECT
    id,
    lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g')) as base_slug
  FROM goals
  WHERE slug IS NULL OR slug = ''
) AS base
WHERE goals.id = base.id;

-- Step 2: Detect and fix duplicate slugs within each user
-- For each user, assign collision-safe slugs to duplicate-name goals
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug TEXT;
BEGIN
  FOR rec IN
    SELECT g.id, g.user_id, g.slug, g.name, COUNT(*) OVER (PARTITION BY user_id, slug) as cnt
    FROM goals g
    WHERE g.slug IS NOT NULL AND g.slug != ''
  LOOP
    IF rec.cnt > 1 THEN
      -- Get existing slugs with same base for this user
      counter := 1;
      new_slug := rec.slug || '-' || counter::TEXT;

      -- Find a unique slot
      WHILE EXISTS (
        SELECT 1 FROM goals
        WHERE user_id = rec.user_id
          AND slug = new_slug
          AND id != rec.id
      ) LOOP
        counter := counter + 1;
        new_slug := rec.slug || '-' || counter::TEXT;
      END LOOP;

      UPDATE goals SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$;

-- Step 3: Add unique constraint per user via partial unique index
-- PostgreSQL doesn't support filtered unique indexes, so use a trigger instead
CREATE OR REPLACE FUNCTION ensure_goal_slug_unique()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RAISE EXCEPTION 'Slug cannot be null or empty';
  END IF;

  SELECT COUNT(*) INTO existing_count
  FROM goals
  WHERE user_id = NEW.user_id
    AND slug = NEW.slug
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Duplicate slug for user: %', NEW.slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goal_slug_unique_trigger ON goals;
CREATE TRIGGER goal_slug_unique_trigger
BEFORE INSERT OR UPDATE OF slug, user_id ON goals
FOR EACH ROW EXECUTE FUNCTION ensure_goal_slug_unique();

-- Clean up the old non-unique index (optional, can keep for read-only help)
-- DROP INDEX IF EXISTS idx_goals_slug;

-- Create a unique index (will fail if duplicates exist after backfill fix above)
-- This confirms the data is clean
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_slug_user ON goals(user_id, slug);
-- Add slug column to projects table
ALTER TABLE projects ADD COLUMN slug TEXT;

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
-- Backfill slugs for existing projects based on normalized name, deduplicated per user
WITH normalized AS (
  SELECT
    id,
    user_id,
    name,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) AS base_slug
  FROM projects
  WHERE slug IS NULL
),
ranked AS (
  SELECT
    id,
    user_id,
    name,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY user_id, base_slug ORDER BY id) AS rn
  FROM normalized
)
UPDATE projects
SET slug = (
  CASE
    WHEN ranked.rn = 1 THEN ranked.base_slug
    ELSE ranked.base_slug || '-' || ranked.rn
  END
)
FROM ranked
WHERE projects.id = ranked.id
  AND projects.slug IS NULL;

-- Create the unique index now that slugs are safely backfilled
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_user ON projects(user_id, slug);
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
CREATE TABLE IF NOT EXISTS project_areas (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_project_areas_project ON project_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_project_areas_area ON project_areas(area_id);

INSERT INTO project_areas (project_id, area_id)
SELECT id, area_id
FROM projects
WHERE area_id IS NOT NULL
ON CONFLICT (project_id, area_id) DO NOTHING;

ALTER TABLE project_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own project_areas" ON project_areas;
CREATE POLICY "Users can only access their own project_areas" ON project_areas FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE projects.id = project_areas.project_id
      AND projects.user_id = auth.uid()
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
    (SELECT count(*) FROM tasks WHERE area_id = target_area_id AND is_archived = false AND is_completed = false)
  ) INTO activity_count;

  UPDATE areas
  SET inactive = (activity_count = 0)
  WHERE id = target_area_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_area_activity_project_areas()
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

DROP TRIGGER IF EXISTS area_activity_project_areas_trigger ON project_areas;
CREATE TRIGGER area_activity_project_areas_trigger
AFTER INSERT OR UPDATE OR DELETE ON project_areas
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_project_areas();

DO $$
DECLARE
  linked_area RECORD;
BEGIN
  FOR linked_area IN SELECT DISTINCT area_id FROM project_areas LOOP
    PERFORM update_area_inactive_status(linked_area.area_id);
  END LOOP;
END $$;
-- Add slug column to notes table
ALTER TABLE notes ADD COLUMN slug TEXT;

-- Index for fast slug lookups per user
CREATE INDEX IF NOT EXISTS idx_notes_slug ON notes(slug);
-- Backfill slugs for existing notes based on normalised name, deduplicated per user
WITH normalized AS (
  SELECT
    id,
    user_id,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) AS base_slug
  FROM notes
  WHERE slug IS NULL
),
ranked AS (
  SELECT
    id,
    user_id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY user_id, base_slug ORDER BY id) AS rn
  FROM normalized
)
UPDATE notes
SET slug = (
  CASE
    WHEN ranked.rn = 1 THEN ranked.base_slug
    ELSE ranked.base_slug || '-' || ranked.rn
  END
)
FROM ranked
WHERE notes.id = ranked.id
  AND notes.slug IS NULL;

-- Unique index now that slugs are safely backfilled
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_slug_user ON notes(user_id, slug);
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
-- Step 21b: Notes module â€” Related Notes bidirectional junction table

CREATE TABLE note_related_notes (
  note_a_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  note_b_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_a_id, note_b_id),
  CHECK (note_a_id < note_b_id)
);

ALTER TABLE note_related_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_related_notes_select_own" ON note_related_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_related_notes.note_a_id
        AND notes.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_related_notes.note_b_id
        AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "note_related_notes_insert_own" ON note_related_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_related_notes.note_a_id
        AND notes.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_related_notes.note_b_id
        AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "note_related_notes_delete_own" ON note_related_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_related_notes.note_a_id
        AND notes.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_related_notes.note_b_id
        AND notes.user_id = auth.uid()
    )
  );

CREATE INDEX idx_note_related_notes_a ON note_related_notes(note_a_id);
CREATE INDEX idx_note_related_notes_b ON note_related_notes(note_b_id);
-- Step 21b: Notes module â€” User settings for default note preferences

CREATE TABLE user_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert_own" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_update_own" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_settings_delete_own" ON user_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_user_settings_user_key ON user_settings(user_id, key);
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
-- Junction table to link resources to tasks

CREATE TABLE task_resources (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, resource_id)
);

ALTER TABLE task_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_resources_select_own" ON task_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "task_resources_insert_own" ON task_resources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "task_resources_delete_own" ON task_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE INDEX idx_task_resources_task ON task_resources(task_id);
CREATE INDEX idx_task_resources_resource ON task_resources(resource_id);
-- Upgrade notes schema: dynamic types, multi-area support, task linkage

-- 1. User-scoped note_types catalog
CREATE TABLE IF NOT EXISTS note_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_note_types_user_slug ON note_types(user_id, slug);
CREATE INDEX idx_note_types_user ON note_types(user_id);

ALTER TABLE note_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_types_select_own" ON note_types;
CREATE POLICY "note_types_select_own" ON note_types FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "note_types_insert_own" ON note_types;
CREATE POLICY "note_types_insert_own" ON note_types FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "note_types_update_own" ON note_types;
CREATE POLICY "note_types_update_own" ON note_types FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "note_types_delete_own" ON note_types;
CREATE POLICY "note_types_delete_own" ON note_types FOR DELETE USING (auth.uid() = user_id);

-- Seed existing enum values into note_types for every user that has notes
INSERT INTO note_types (user_id, name, slug)
SELECT DISTINCT user_id, 'Note', 'note'
FROM notes
ON CONFLICT (user_id, slug) DO NOTHING;

INSERT INTO note_types (user_id, name, slug)
SELECT DISTINCT user_id, 'Research', 'research'
FROM notes
ON CONFLICT (user_id, slug) DO NOTHING;

INSERT INTO note_types (user_id, name, slug)
SELECT DISTINCT user_id, 'Journal', 'journal'
FROM notes
ON CONFLICT (user_id, slug) DO NOTHING;

-- Also seed any distinct custom values already stored in notes
INSERT INTO note_types (user_id, name, slug)
SELECT DISTINCT user_id,
  INITCAP(type::text) AS name,
  LOWER(REGEXP_REPLACE(type::text, '[^a-z0-9]+', '-', 'g')) AS slug
FROM notes
WHERE type::text NOT IN ('note', 'research', 'journal')
ON CONFLICT (user_id, slug) DO NOTHING;

-- 2. Migrate notes.type from enum to text
ALTER TABLE notes ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- 3. Create note_areas junction table
CREATE TABLE IF NOT EXISTS note_areas (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_note_areas_note ON note_areas(note_id);
CREATE INDEX IF NOT EXISTS idx_note_areas_area ON note_areas(area_id);

INSERT INTO note_areas (note_id, area_id)
SELECT id, area_id
FROM notes
WHERE area_id IS NOT NULL
ON CONFLICT (note_id, area_id) DO NOTHING;

ALTER TABLE note_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own note_areas" ON note_areas;
CREATE POLICY "Users can only access their own note_areas" ON note_areas FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM notes
    WHERE notes.id = note_areas.note_id
      AND notes.user_id = auth.uid()
  )
);

-- 4. Create task_notes junction table
CREATE TABLE IF NOT EXISTS task_notes (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, note_id)
);

CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_note ON task_notes(note_id);

ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_notes_select_own" ON task_notes;
CREATE POLICY "task_notes_select_own" ON task_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_notes.task_id
        AND tasks.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "task_notes_insert_own" ON task_notes;
CREATE POLICY "task_notes_insert_own" ON task_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_notes.task_id
        AND tasks.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "task_notes_delete_own" ON task_notes;
CREATE POLICY "task_notes_delete_own" ON task_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_notes.task_id
        AND tasks.user_id = auth.uid()
    )
  );

-- 5. Update area inactive status to also count notes
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
      ) active_resources) +
    (SELECT count(*)
      FROM (
        SELECT n.id
        FROM notes n
        WHERE n.is_archived = false
          AND (
            n.area_id = target_area_id
            OR EXISTS (
              SELECT 1
              FROM note_areas na
              WHERE na.note_id = n.id
                AND na.area_id = target_area_id
            )
          )
      ) active_notes)
  ) INTO activity_count;

  UPDATE areas
  SET inactive = (activity_count = 0)
  WHERE id = target_area_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for note_areas junction table changes
CREATE OR REPLACE FUNCTION trigger_area_activity_note_areas()
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

DROP TRIGGER IF EXISTS area_activity_note_areas_trigger ON note_areas;
CREATE TRIGGER area_activity_note_areas_trigger
AFTER INSERT OR UPDATE OR DELETE ON note_areas
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_note_areas();

-- Trigger for notes table changes (area_id, is_archived)
CREATE OR REPLACE FUNCTION trigger_area_activity_notes()
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

DROP TRIGGER IF EXISTS area_activity_notes_trigger ON notes;
CREATE TRIGGER area_activity_notes_trigger
AFTER INSERT OR UPDATE OR DELETE ON notes
FOR EACH ROW EXECUTE FUNCTION trigger_area_activity_notes();

-- Backfill inactive status for all areas linked to notes
DO $$
DECLARE
  linked_area RECORD;
BEGIN
  FOR linked_area IN SELECT DISTINCT area_id FROM note_areas LOOP
    PERFORM update_area_inactive_status(linked_area.area_id);
  END LOOP;
END $$;
-- Step: Note-to-project linkage
-- Junction table to link notes to multiple projects (powers multi-project notes)

CREATE TABLE note_projects (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, project_id)
);

ALTER TABLE note_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_projects_select_own" ON note_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_projects.note_id
        AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "note_projects_insert_own" ON note_projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_projects.note_id
        AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "note_projects_delete_own" ON note_projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_projects.note_id
        AND notes.user_id = auth.uid()
    )
  );

CREATE INDEX idx_note_projects_note ON note_projects(note_id);
CREATE INDEX idx_note_projects_project ON note_projects(project_id);
-- contact_areas junction table
create table if not exists contact_areas (
  contact_id uuid not null references contacts(id) on delete cascade,
  area_id    uuid not null references areas(id)    on delete cascade,
  primary key (contact_id, area_id)
);

create index if not exists contact_areas_area_idx on contact_areas(area_id);

create policy "Users can manage own contact_area links"
  on contact_areas for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_areas.contact_id
        and contacts.user_id = auth.uid()
    )
  );

alter table contact_areas enable row level security;
-- contact_goals junction table
create table if not exists contact_goals (
  contact_id uuid not null references contacts(id) on delete cascade,
  goal_id    uuid not null references goals(id)    on delete cascade,
  primary key (contact_id, goal_id)
);

create index if not exists contact_goals_goal_idx on contact_goals(goal_id);

create policy "Users can manage own contact_goal links"
  on contact_goals for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_goals.contact_id
        and contacts.user_id = auth.uid()
    )
  );

alter table contact_goals enable row level security;
-- Add slug column to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slugs for existing topics using name
UPDATE topics
SET slug = base_slug
FROM (
  SELECT
    id,
    lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g')) as base_slug
  FROM topics
  WHERE slug IS NULL OR slug = ''
) AS base
WHERE topics.id = base.id;

-- Handle duplicate slugs within each user
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug TEXT;
BEGIN
  FOR rec IN
    SELECT t.id, t.user_id, t.slug, t.name, COUNT(*) OVER (PARTITION BY user_id, slug) as cnt
    FROM topics t
    WHERE t.slug IS NOT NULL AND t.slug != ''
  LOOP
    IF rec.cnt > 1 THEN
      counter := 1;
      new_slug := rec.slug || '-' || counter::TEXT;

      WHILE EXISTS (
        SELECT 1 FROM topics
        WHERE user_id = rec.user_id
          AND slug = new_slug
          AND id != rec.id
      ) LOOP
        counter := counter + 1;
        new_slug := rec.slug || '-' || counter::TEXT;
      END LOOP;

      UPDATE topics SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END
$$;

-- Create unique index (per user)
CREATE UNIQUE INDEX IF NOT EXISTS topics_user_slug_idx ON topics(user_id, slug) WHERE slug IS NOT NULL;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_topics_user_archived ON topics(user_id) WHERE is_archived = true;
-- Add image_url to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create contact_logs table
CREATE TABLE IF NOT EXISTS contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_logs_contact_id ON contact_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_user_id ON contact_logs(user_id);

ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contact logs"
  ON contact_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Create contact-avatars storage bucket (public for read, authenticated for write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-avatars',
  'contact-avatars',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/update/delete their own files
CREATE POLICY "Users can upload their own contact avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contact-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own contact avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contact-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own contact avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contact-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read for all contact avatar files
CREATE POLICY "Anyone can view contact avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-avatars');
-- Add slug column to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index per user so two contacts of same user cannot share a slug
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_id_slug_idx ON contacts (user_id, slug)
  WHERE slug IS NOT NULL;

-- Back-fill existing contacts: slug = lower(name) with spacesâ†’hyphens, non-alphanumeric stripped
UPDATE contacts
SET slug = lower(regexp_replace(
  regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
))
WHERE slug IS NULL;

-- Auto-generate slug on insert/update when slug is null
CREATE OR REPLACE FUNCTION contacts_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(
      regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_set_slug_trigger ON contacts;
CREATE TRIGGER contacts_set_slug_trigger
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_set_slug();
-- Make the contact-avatars bucket publicly readable
UPDATE storage.buckets
SET public = true
WHERE id = 'contact-avatars';

-- Allow authenticated users to upload/overwrite objects in their own folder
DO $$
BEGIN
  CREATE POLICY "Users can upload their own contact avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow public reads (bucket is public but row-level policy is belt-and-suspenders)
DO $$
BEGIN
  CREATE POLICY "Public read for contact avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contact-avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow users to update/replace their own images
DO $$
BEGIN
  CREATE POLICY "Users can update their own contact avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Backfill last_interaction_at on contacts from their most recent log
-- Applies only where last_interaction_at is currently NULL but logs exist
UPDATE contacts c
SET last_interaction_at = (
  SELECT MAX(logged_at)
  FROM contact_logs cl
  WHERE cl.contact_id = c.id
)
WHERE c.last_interaction_at IS NULL
  AND EXISTS (
    SELECT 1 FROM contact_logs cl WHERE cl.contact_id = c.id
  );
-- Auto-update contacts.last_interaction_at whenever a contact_log is inserted
CREATE OR REPLACE FUNCTION contact_logs_update_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET last_interaction_at = NEW.logged_at
  WHERE id = NEW.contact_id
    AND (last_interaction_at IS NULL OR NEW.logged_at > last_interaction_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_logs_update_interaction ON contact_logs;
CREATE TRIGGER trg_contact_logs_update_interaction
  AFTER INSERT ON contact_logs
  FOR EACH ROW EXECUTE FUNCTION contact_logs_update_interaction();
-- Add 'saved' to note_status and resource_status enums
ALTER TYPE note_status ADD VALUE IF NOT EXISTS 'saved';
ALTER TYPE resource_status ADD VALUE IF NOT EXISTS 'saved';
-- Fix two compounding bugs in DB progress recalculation:
--
-- 1) recalc_project_progress only counted tasks. Notes and resources linked to
--    the project were ignored, so a project with 1 completed task + 1 note + 1
--    resource was stored as progress=100 instead of 33.
--
-- 2) recalc_goal_progress auto-flipped goals.is_completed = true whenever the
--    computed average hit 100. Combined with bug #1 this silently marked goals
--    as completed when a single task was ticked off. Goal completion is now
--    user-controlled only; this function updates progress and never touches
--    is_completed.

CREATE OR REPLACE FUNCTION recalc_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  proj_id UUID;
  total_items INT := 0;
  completed_items INT := 0;
BEGIN
  proj_id := COALESCE(NEW.project_id, OLD.project_id);

  IF proj_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(SUM(item_total), 0),
    COALESCE(SUM(item_completed), 0)
  INTO total_items, completed_items
  FROM (
    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE is_completed) AS item_completed
    FROM tasks
    WHERE project_id = proj_id AND is_archived = false

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM notes
    WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
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

-- Re-fire on notes and resources too, not just tasks
DROP TRIGGER IF EXISTS on_task_completed ON tasks;
CREATE TRIGGER on_task_completed
AFTER INSERT OR UPDATE OF is_completed, is_archived, project_id OR DELETE ON tasks
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

DROP TRIGGER IF EXISTS on_note_status_change ON notes;
CREATE TRIGGER on_note_status_change
AFTER INSERT OR UPDATE OF status, is_archived, project_id OR DELETE ON notes
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

DROP TRIGGER IF EXISTS on_resource_status_change ON resources;
CREATE TRIGGER on_resource_status_change
AFTER INSERT OR UPDATE OF status, is_archived, project_id OR DELETE ON resources
FOR EACH ROW EXECUTE PROCEDURE recalc_project_progress();

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
  SET progress = CASE
    WHEN linked_items = 0 THEN 0
    ELSE average_progress
  END
  WHERE id = target_goal_id;
END;
$$ LANGUAGE plpgsql;

-- Backfill: recompute progress for every project so any DB rows still stuck at
-- the old (task-only) value get corrected.
UPDATE projects pr
SET progress = sub.progress
FROM (
  SELECT
    proj.id AS project_id,
    CASE
      WHEN COALESCE(SUM(item_total), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(item_completed), 0)::numeric / SUM(item_total)::numeric) * 100)
    END AS progress
  FROM projects proj
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE is_completed) AS item_completed
    FROM tasks
    WHERE project_id = proj.id AND is_archived = false

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM notes
    WHERE project_id = proj.id AND is_archived = false AND status <> 'archive'

    UNION ALL

    SELECT
      COUNT(*) AS item_total,
      COUNT(*) FILTER (WHERE status = 'saved') AS item_completed
    FROM resources
    WHERE project_id = proj.id AND is_archived = false
  ) AS combined ON TRUE
  GROUP BY proj.id
) AS sub
WHERE pr.id = sub.project_id;

-- Recompute goal.progress for every non-archived goal (is_completed left
-- untouched, so anything stuck completed-by-bug must be unchecked by the user).
DO $$
DECLARE
  g RECORD;
BEGIN
  FOR g IN SELECT id FROM goals WHERE is_archived = false LOOP
    PERFORM recalc_goal_progress(g.id);
  END LOOP;
END;
$$;
-- task_projects: multi-project links for tasks (mirrors task_areas).
-- A task can be linked to one or more projects. The legacy single
-- tasks.project_id remains the "primary" project for backward compat.

CREATE TABLE IF NOT EXISTS task_projects (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_task_projects_task ON task_projects(task_id);
CREATE INDEX IF NOT EXISTS idx_task_projects_project ON task_projects(project_id);

-- Backfill from the single project_id column so existing tasks remain visible
-- under their current project bubble while the new multi-project UI rolls in.
INSERT INTO task_projects (task_id, project_id)
SELECT id, project_id
FROM tasks
WHERE project_id IS NOT NULL
ON CONFLICT (task_id, project_id) DO NOTHING;

ALTER TABLE task_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own task_projects" ON task_projects;
CREATE POLICY "Users can only access their own task_projects" ON task_projects FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM tasks
    WHERE tasks.id = task_projects.task_id
      AND tasks.user_id = auth.uid()
  )
);
-- Notebooks as tags: many notebooks per note, replacing notes.notebook (single).

CREATE TABLE note_notebooks (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  notebook TEXT NOT NULL CHECK (char_length(notebook) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, notebook)
);

ALTER TABLE note_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_notebooks_select_own" ON note_notebooks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_notebooks.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "note_notebooks_insert_own" ON note_notebooks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_notebooks.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "note_notebooks_delete_own" ON note_notebooks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_notebooks.note_id AND notes.user_id = auth.uid())
  );

CREATE INDEX idx_note_notebooks_note ON note_notebooks(note_id);
CREATE INDEX idx_note_notebooks_notebook ON note_notebooks(notebook);
-- Copy each note's single notebook string into the junction table.
INSERT INTO note_notebooks (note_id, notebook)
SELECT id, notebook
FROM notes
WHERE notebook IS NOT NULL AND char_length(trim(notebook)) > 0
ON CONFLICT (note_id, notebook) DO NOTHING;
-- Related notes are now derived from shared notebooks; the edge table is obsolete.
DROP TABLE IF EXISTS note_related_notes;
-- notes.notebook is fully replaced by the note_notebooks junction table.
ALTER TABLE notes DROP COLUMN IF EXISTS notebook;
-- Add is_inactive flag to goals so the goals workflow distinguishes
-- "paused" goals (inactive) from soft-deleted ones (archived).
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS is_inactive BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN goals.is_inactive IS
  'User-paused goal. Hidden from active views but not archived.';

CREATE INDEX IF NOT EXISTS idx_goals_is_inactive ON goals(is_inactive);
-- Add a real 'inbox' value to project_status so projects are symmetric with
-- tasks/notes/resources. Previously the project "inbox" was faked as 'planning'.
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'inbox' BEFORE 'planning';
-- Re-flag existing contextless projects (no linked area AND no linked goal) that
-- are still sitting at the old fake-inbox status 'planning' as the real 'inbox'.
UPDATE projects p
SET status = 'inbox'
WHERE p.status = 'planning'
  AND NOT EXISTS (SELECT 1 FROM project_areas pa WHERE pa.project_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM goal_projects gp WHERE gp.project_id = p.id);
-- Remembers the status a task held before it was completed, so un-completing
-- can restore it. Nullable; only set while a task is in the completed state.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS previous_status task_status;
-- Reconcile stale 'inbox' statuses on rows that already have organizing context.
-- A previous version of the create dialog submitted status='inbox' unconditionally
-- when a user picked an area/project/goal/topic in the same session, leaving the
-- status out of sync with the context. Flip them to the derived value.

-- Tasks: inbox -> todo when the task has an area or project.
UPDATE tasks t
SET status = 'todo'
WHERE t.status = 'inbox'
  AND (
    t.area_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM task_areas ta WHERE ta.task_id = t.id)
    OR EXISTS (SELECT 1 FROM task_projects tp WHERE tp.task_id = t.id)
  );

-- Notes: inbox -> to_review when the note has any context.
UPDATE notes n
SET status = 'to_review'
WHERE n.status = 'inbox'
  AND (
    n.area_id IS NOT NULL
    OR n.project_id IS NOT NULL
    OR n.topic_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM note_areas na WHERE na.note_id = n.id)
    OR EXISTS (SELECT 1 FROM goal_notes gn WHERE gn.note_id = n.id)
    OR EXISTS (SELECT 1 FROM note_projects np WHERE np.note_id = n.id)
  );

-- Resources: inbox -> to_review when the resource has any context.
UPDATE resources r
SET status = 'to_review'
WHERE r.status = 'inbox'
  AND (
    r.area_id IS NOT NULL
    OR r.project_id IS NOT NULL
    OR r.topic_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM resource_areas ra WHERE ra.resource_id = r.id)
    OR EXISTS (SELECT 1 FROM goal_resources gr WHERE gr.resource_id = r.id)
  );
-- Reconcile project inbox status when the primary `projects.area_id`
-- column is populated. The previous reconcile only checked junction tables
-- (`project_areas` / `goal_projects`); the `deriveProjectStatus` helper
-- also considers the primary `area_id` column, so projects linked via
-- `replaceAreaLinks` (which writes `projects.area_id` directly) were
-- missed. Flip those rows to `planning`.

UPDATE projects p
SET status = 'planning'
WHERE p.status = 'inbox'
  AND p.area_id IS NOT NULL;
-- Recurring-task support on the tasks table.
--
-- `next_due_date` is deliberately NOT persisted. It is derived from
--   `due_date + repeat_every + repeat_cycle`
-- to avoid drift between a stored value and the live schedule. The dialog
-- previews the next due date live, and `complete_recurring_task` recomputes
-- it at completion time.

create type public.task_repeat_cycle as enum (
  'days',
  'weeks',
  'months',
  'years',
  'months_first_weekday',
  'months_last_weekday',
  'months_second_saturday',
  'months_last_day'
);

alter table public.tasks
  add column is_recurring boolean not null default false,
  add column repeat_every integer,
  add column repeat_cycle public.task_repeat_cycle,
  add column recurrence_source_task_id uuid references public.tasks(id) on delete set null;

alter table public.tasks
  add constraint tasks_repeat_every_positive
  check (repeat_every is null or repeat_every >= 1);

create index if not exists tasks_recurrence_source_idx
  on public.tasks (recurrence_source_task_id);

alter table public.tasks
  add constraint tasks_recurrence_fields_consistent
  check (
    (is_recurring = false and repeat_every is null and repeat_cycle is null)
    or
    (is_recurring = true and repeat_every is not null and repeat_cycle is not null)
  );

-- Atomic recurring completion. The caller (TS service) computes the
-- `p_next_due_date` value from the same `computeNextTaskDueDate` helper that
-- powers the dialog preview, so the SQL never re-implements the calendar
-- math.
--
-- What this function does, in one transaction:
-- 1. Lock the source row.
-- 2. Mark the source row complete (status = completed, is_completed = true,
--    completed_at = now, previous_status preserved from existing row when
--    not already completed).
-- 3. Insert a new task row carrying the source's flags + recurrence
--    configuration, with `recurrence_source_task_id` pointing back to the
--    completed source.
-- 4. Copy `task_areas`, `goal_tasks`, and `task_projects` join rows so the
--    next occurrence inherits all of the source's PARA links.
-- 5. Return both ids.
create or replace function public.complete_recurring_task(
  p_user_id uuid,
  p_task_id uuid,
  p_next_due_date date,
  p_next_status public.task_status
) returns table (
  completed_task_id uuid,
  spawned_task_id uuid
)
language plpgsql
security definer
as $$
declare
  v_source public.tasks;
  v_previous_status public.task_status;
  v_completed_id uuid;
  v_spawned_id uuid;
begin
  -- Lock + validate source row.
  select * into v_source
  from public.tasks
  where id = p_task_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Task % not found for user %', p_task_id, p_user_id;
  end if;

  if v_source.is_recurring is not true then
    raise exception 'Task % is not recurring', p_task_id;
  end if;

  v_previous_status := case
    when v_source.status = 'completed' then v_source.previous_status
    else v_source.status
  end;

  -- Mark source complete.
  update public.tasks
  set
    is_completed = true,
    completed_at = now(),
    status = 'completed',
    previous_status = coalesce(v_previous_status, v_source.status),
    updated_at = now()
  where id = p_task_id
  returning id into v_completed_id;

  -- Spawn the next instance. Carries forward every field that defines the
  -- task's identity (name, description, priority, focus/important/urgent,
  -- area, project, recurrence configuration) and resets the workflow state
  -- to the source's pre-completion status.
  insert into public.tasks (
    user_id,
    area_id,
    project_id,
    name,
    description,
    status,
    priority,
    due_date,
    is_completed,
    is_focused,
    is_important,
    is_urgent,
    completed_at,
    previous_status,
    smart_priority,
    is_archived,
    is_recurring,
    repeat_every,
    repeat_cycle,
    recurrence_source_task_id
  ) values (
    v_source.user_id,
    v_source.area_id,
    v_source.project_id,
    v_source.name,
    v_source.description,
    coalesce(p_next_status, v_previous_status, v_source.status, 'todo'),
    v_source.priority,
    p_next_due_date,
    false,
    v_source.is_focused,
    v_source.is_important,
    v_source.is_urgent,
    null,
    null,
    v_source.smart_priority,
    false,
    true,
    v_source.repeat_every,
    v_source.repeat_cycle,
    v_source.id
  )
  returning id into v_spawned_id;

  -- Copy join-table links so the next instance inherits the source's PARA
  -- chain. `task_areas` and `task_projects` are copied with explicit
  -- user_id matches; `goal_tasks` is the legacy join table used by
  -- goal-scoped task views.
  insert into public.task_areas (task_id, area_id)
  select v_spawned_id, area_id
  from public.task_areas
  where task_id = v_source.id
  on conflict do nothing;

  insert into public.task_projects (task_id, project_id)
  select v_spawned_id, project_id
  from public.task_projects
  where task_id = v_source.id
  on conflict do nothing;

  insert into public.goal_tasks (task_id, goal_id)
  select v_spawned_id, goal_id
  from public.goal_tasks
  where task_id = v_source.id
  on conflict do nothing;

  completed_task_id := v_completed_id;
  spawned_task_id := v_spawned_id;
  return next;
end;
$$;

-- Atomic undo for a recurring completion. Caller passes both ids so we
-- don't accidentally delete an unrelated row.
--
-- 1. Verify the spawned row's `recurrence_source_task_id` points at the
--    completed task.
-- 2. Delete the spawned row's join-table entries first to avoid FK
--    violations.
-- 3. Delete the spawned row.
-- 4. Restore the source row to its pre-completion workflow state.
create or replace function public.undo_complete_recurring_task(
  p_user_id uuid,
  p_completed_task_id uuid,
  p_spawned_task_id uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_spawned public.tasks;
  v_source public.tasks;
  v_restored_status public.task_status;
begin
  select * into v_spawned
  from public.tasks
  where id = p_spawned_task_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Spawned task % not found', p_spawned_task_id;
  end if;

  if v_spawned.recurrence_source_task_id is distinct from p_completed_task_id then
    raise exception 'Spawned task % is not linked to completed task %', p_spawned_task_id, p_completed_task_id;
  end if;

  delete from public.task_areas where task_id = p_spawned_task_id;
  delete from public.task_projects where task_id = p_spawned_task_id;
  delete from public.goal_tasks where task_id = p_spawned_task_id;
  delete from public.tasks where id = p_spawned_task_id;

  -- Restore the source row's workflow state. Fall back to the existing
  -- previous_status, otherwise derive a fresh status from current context.
  select * into v_source
  from public.tasks
  where id = p_completed_task_id and user_id = p_user_id
  for update;

  v_restored_status := coalesce(v_source.previous_status, 'todo');

  update public.tasks
  set
    is_completed = false,
    completed_at = null,
    status = v_restored_status,
    previous_status = null,
    updated_at = now()
  where id = p_completed_task_id;

  return p_completed_task_id;
end;
$$;
-- Drop the 'urgent' priority value. The is_urgent boolean already encodes this signal.
-- Strategy: migrate existing 'urgent' rows to 'high', recreate the enum, recreate the function.

-- Step 1: migrate any existing 'urgent' rows in tasks and projects
UPDATE tasks SET priority = 'high' WHERE priority = 'urgent';
UPDATE projects SET priority = 'high' WHERE priority = 'urgent';

-- Step 2: drop the trigger that depends on the enum column (it does, indirectly)
DROP TRIGGER IF EXISTS trg_tasks_smart_priority ON tasks;
DROP FUNCTION IF EXISTS set_task_smart_priority();
DROP FUNCTION IF EXISTS calc_smart_priority(
  DATE, priority, BOOLEAN, BOOLEAN, INTEGER
);

-- Step 3: alter the columns to TEXT, drop the enum, recreate with new values
ALTER TABLE tasks ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE tasks ALTER COLUMN priority TYPE TEXT USING priority::TEXT;
ALTER TABLE projects ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE projects ALTER COLUMN priority TYPE TEXT USING priority::TEXT;
DROP TYPE IF EXISTS priority CASCADE;
CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
ALTER TABLE tasks ALTER COLUMN priority TYPE priority USING priority::text::priority;
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'medium'::priority;
ALTER TABLE projects ALTER COLUMN priority TYPE priority USING priority::text::priority;
ALTER TABLE projects ALTER COLUMN priority SET DEFAULT 'medium'::priority;

-- Step 4: recreate the smart priority function (Task 2/3 will add project_count + round-up)
-- Keeping the same 5-param signature here so we don't break anything mid-migration.
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
  -- Due date proximity (30%): 1.5 if overdue, scaled 0â€“1.5 within 14 days, 0.5 if null
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

  -- Normalize to 1â€“5 (max possible = 1.5 + 1.25 + 1.25 + 1.0 = 5.0)
  RETURN GREATEST(1, LEAST(5, ROUND(score)));
END;
$$ LANGUAGE plpgsql STABLE;

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
  -- Due date proximity (30%): 1.5 if overdue, scaled 0â€“1.5 within 14 days, 0.5 if null
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

  -- Normalize to 1â€“5 (max possible = 1.5 + 1.25 + 1.25 + 1.0 = 5.0)
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
  -- Due date proximity (30%): 1.5 if overdue, scaled 0â€“1.5 within 14 days, 0.5 if null
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
-- Rename 'saved' to 'completed' in note_status and resource_status enums
-- Existing DB records with 'saved' will now show as 'completed'

ALTER TYPE note_status RENAME VALUE 'saved' TO 'completed';
ALTER TYPE resource_status RENAME VALUE 'saved' TO 'completed';
-- Add priority column to goals
-- The priority enum type exists but the column was never added
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS priority priority NOT NULL DEFAULT 'medium';

COMMENT ON COLUMN goals.priority IS 'Goal priority level (low, medium, high)';

CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
-- Migration: convert resources.project_id (single FK) â†’ resource_projects junction
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
-- Fix recalc_project_progress: status = 'saved' was renamed to 'completed'
-- in 20260609000000_rename_saved_to_completed.sql, but this trigger function
-- body still compares against the old literal. The implicit textâ†’enum cast
-- fails on UPDATE because the enum no longer has 'saved', so every resource
-- update fires a DatabaseError from the trigger.

CREATE OR REPLACE FUNCTION public.recalc_project_progress()
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
               COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
        FROM notes
        WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'
        UNION ALL
        SELECT COUNT(*) AS item_total,
               COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
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
           COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
    FROM notes
    WHERE project_id = proj_id AND is_archived = false AND status <> 'archive'
    UNION ALL
    SELECT COUNT(*) AS item_total,
           COUNT(*) FILTER (WHERE status = 'completed') AS item_completed
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
-- Security hardening
--
-- C1: contact_projects / contact_tasks had policies defined in
--     20260427000003_create_contacts.sql but ENABLE ROW LEVEL SECURITY was
--     never run, so the policies were inert and the tables were fully exposed
--     to any authenticated user. Enable RLS now.
--
-- C2: topic_areas (20260427000002_create_topics.sql) had neither RLS enabled
--     nor any policy. Enable RLS and add an ownership policy via the parent
--     topic.
--
-- H1: complete_recurring_task / undo_complete_recurring_task are
--     SECURITY DEFINER and scoped on a client-supplied p_user_id. A caller
--     could pass another user's id. Re-derive identity from auth.uid() and
--     drop the p_user_id parameter.

-- â”€â”€â”€ C1: enable RLS on contact join tables (policies already exist) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE contact_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tasks ENABLE ROW LEVEL SECURITY;

-- â”€â”€â”€ C2: topic_areas â€” enable RLS and add ownership policy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE topic_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own topic_areas" ON topic_areas;
CREATE POLICY "Users can only access their own topic_areas" ON topic_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM topics
      WHERE topics.id = topic_areas.topic_id
        AND topics.user_id = auth.uid()
    )
  );

-- â”€â”€â”€ H1: harden recurring-task RPCs to use auth.uid() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Signature changes (p_user_id removed) require dropping the old functions.
DROP FUNCTION IF EXISTS public.complete_recurring_task(uuid, uuid, date, public.task_status);
DROP FUNCTION IF EXISTS public.undo_complete_recurring_task(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.complete_recurring_task(
  p_task_id uuid,
  p_next_due_date date,
  p_next_status public.task_status
) returns table (
  completed_task_id uuid,
  spawned_task_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.tasks;
  v_previous_status public.task_status;
  v_completed_id uuid;
  v_spawned_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock + validate source row (scoped to the authenticated user).
  select * into v_source
  from public.tasks
  where id = p_task_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Task % not found for current user', p_task_id;
  end if;

  if v_source.is_recurring is not true then
    raise exception 'Task % is not recurring', p_task_id;
  end if;

  v_previous_status := case
    when v_source.status = 'completed' then v_source.previous_status
    else v_source.status
  end;

  update public.tasks
  set
    is_completed = true,
    completed_at = now(),
    status = 'completed',
    previous_status = coalesce(v_previous_status, v_source.status),
    updated_at = now()
  where id = p_task_id
  returning id into v_completed_id;

  insert into public.tasks (
    user_id,
    area_id,
    project_id,
    name,
    description,
    status,
    priority,
    due_date,
    is_completed,
    is_focused,
    is_important,
    is_urgent,
    completed_at,
    previous_status,
    smart_priority,
    is_archived,
    is_recurring,
    repeat_every,
    repeat_cycle,
    recurrence_source_task_id
  ) values (
    v_source.user_id,
    v_source.area_id,
    v_source.project_id,
    v_source.name,
    v_source.description,
    coalesce(p_next_status, v_previous_status, v_source.status, 'todo'),
    v_source.priority,
    p_next_due_date,
    false,
    v_source.is_focused,
    v_source.is_important,
    v_source.is_urgent,
    null,
    null,
    v_source.smart_priority,
    false,
    true,
    v_source.repeat_every,
    v_source.repeat_cycle,
    v_source.id
  )
  returning id into v_spawned_id;

  insert into public.task_areas (task_id, area_id)
  select v_spawned_id, area_id
  from public.task_areas
  where task_id = v_source.id
  on conflict do nothing;

  insert into public.task_projects (task_id, project_id)
  select v_spawned_id, project_id
  from public.task_projects
  where task_id = v_source.id
  on conflict do nothing;

  insert into public.goal_tasks (task_id, goal_id)
  select v_spawned_id, goal_id
  from public.goal_tasks
  where task_id = v_source.id
  on conflict do nothing;

  completed_task_id := v_completed_id;
  spawned_task_id := v_spawned_id;
  return next;
end;
$$;

CREATE OR REPLACE FUNCTION public.undo_complete_recurring_task(
  p_completed_task_id uuid,
  p_spawned_task_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_spawned public.tasks;
  v_source public.tasks;
  v_restored_status public.task_status;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_spawned
  from public.tasks
  where id = p_spawned_task_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Spawned task % not found', p_spawned_task_id;
  end if;

  if v_spawned.recurrence_source_task_id is distinct from p_completed_task_id then
    raise exception 'Spawned task % is not linked to completed task %', p_spawned_task_id, p_completed_task_id;
  end if;

  delete from public.task_areas where task_id = p_spawned_task_id;
  delete from public.task_projects where task_id = p_spawned_task_id;
  delete from public.goal_tasks where task_id = p_spawned_task_id;
  delete from public.tasks where id = p_spawned_task_id;

  select * into v_source
  from public.tasks
  where id = p_completed_task_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Completed task % not found for current user', p_completed_task_id;
  end if;

  v_restored_status := coalesce(v_source.previous_status, 'todo');

  update public.tasks
  set
    is_completed = false,
    completed_at = null,
    status = v_restored_status,
    previous_status = null,
    updated_at = now()
  where id = p_completed_task_id;

  return p_completed_task_id;
end;
$$;
-- M4: make the contact-avatars bucket private.
--
-- Avatars were stored as public URLs and the bucket was world-readable
-- (anyone with the URL could view them). Switch to a private bucket with
-- owner-only read, and have the app resolve short-lived signed URLs on read.
--
-- The stored contacts.image_url is normalized from a full public URL to the
-- bare object path (e.g. "<user_id>/<contact_id>.png"). The service signs
-- this path at read time.

-- 1. Flip the bucket to private.
UPDATE storage.buckets
SET public = false
WHERE id = 'contact-avatars';

-- 2. Replace the public-read policy with an owner-only read policy.
DROP POLICY IF EXISTS "Public read for contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contact avatars" ON storage.objects;

DO $$
BEGIN
  CREATE POLICY "Users can view their own contact avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Normalize existing image_url values: strip the public-URL prefix down to
--    the object path. Rows already holding a bare path or NULL are untouched.
UPDATE public.contacts
SET image_url = substring(
  image_url
  FROM position('/storage/v1/object/public/contact-avatars/' in image_url)
       + length('/storage/v1/object/public/contact-avatars/')
)
WHERE image_url LIKE '%/storage/v1/object/public/contact-avatars/%';
-- Drop legacy foreign keys from app tables to auth.users(id).
-- Required as a prerequisite to 20260618000001_clerk_rls_rewrite.sql, which
-- widens user_id from uuid to text. Clerk users do not live in auth.users,
-- so the FK is dropped without a replacement â€” ownership is now enforced
-- exclusively by RLS policies reading (select auth.jwt()->>'sub').
--
-- Idempotent: drop constraint if exists makes this safe to re-run.
-- Constraint names follow Postgres' default <table>_<col>_fkey pattern;
-- verified against the original 00003_create_areas.sql FK definition.

begin;

alter table areas         drop constraint if exists areas_user_id_fkey;
alter table goals         drop constraint if exists goals_user_id_fkey;
alter table projects      drop constraint if exists projects_user_id_fkey;
alter table tasks         drop constraint if exists tasks_user_id_fkey;
alter table notes         drop constraint if exists notes_user_id_fkey;
alter table resources     drop constraint if exists resources_user_id_fkey;
alter table topics        drop constraint if exists topics_user_id_fkey;
alter table contacts      drop constraint if exists contacts_user_id_fkey;
alter table contact_logs  drop constraint if exists contact_logs_user_id_fkey;
alter table note_types    drop constraint if exists note_types_user_id_fkey;
alter table user_settings drop constraint if exists user_settings_user_id_fkey;

commit;
-- Drop policies on indirect-ownership tables that reference user_id columns
-- on the direct-ownership tables. Required as a prerequisite to
-- 20260618000001_clerk_rls_rewrite.sql, which widens user_id from uuid to
-- text. Postgres refuses to alter a column type if any policy references it,
-- even via subquery on a different table.
--
-- The rewrite migration re-creates these policies with Clerk-shaped
-- (select auth.jwt()->>'sub') expressions in its own Section 2, so this
-- drop is safe â€” the policies come back identical in intent, just rewritten
-- for Clerk's text user id.
--
-- Dynamic: enumerates policies on the known indirect-ownership tables
-- via pg_policy + pg_class, drops them by name. Idempotent.

begin;

do $$
declare
  r record;
begin
  for r in
    select p.polname as policy_name, c.relname as table_name
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname in (
        'goal_projects', 'goal_tasks', 'goal_notes', 'goal_resources', 'goal_areas',
        'project_areas',
        'task_areas', 'task_notes', 'task_resources', 'task_projects',
        'note_areas', 'note_projects', 'note_related_notes', 'note_notebooks',
        'resource_areas', 'resource_projects',
        'contact_areas', 'contact_goals', 'contact_projects', 'contact_tasks',
        'topic_areas'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policy_name, r.table_name);
  end loop;
end $$;

commit;
-- Drop triggers on direct-ownership tables that reference user_id.
-- Required as a prerequisite to 20260618000001_clerk_rls_rewrite.sql, which
-- widens user_id from uuid to text. Postgres refuses to alter a column's
-- type if any trigger definition references the column (in its column list
-- or in the underlying function's source).
--
-- A companion post-rewrite migration
-- (20260619000001_recreate_user_id_dependent_triggers.sql) re-creates the
-- dropped triggers with text-compatible logic.
--
-- Dynamic: queries pg_trigger + pg_proc to find triggers whose column
-- list (in pg_get_triggerdef) or whose function source (pg_proc.prosrc)
-- contains a reference to user_id. Idempotent.

begin;

do $$
declare
  r record;
begin
  for r in
    select
      t.tgname as trigger_name,
      c.relname as table_name,
      pg_get_triggerdef(t.oid) as trigger_def,
      p.prosrc as function_source
    from pg_trigger t
    join pg_class c on t.tgrelid = c.oid
    join pg_proc p on t.tgfoid = p.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and not t.tgisinternal
      and c.relname in (
        'areas', 'goals', 'projects', 'tasks', 'notes', 'resources',
        'topics', 'contacts', 'contact_logs', 'note_types', 'user_settings'
      )
      and (
        pg_get_triggerdef(t.oid) ilike '%user_id%'
        or p.prosrc ilike '%user_id%'
      )
  loop
    raise notice 'dropping trigger %.% (depends on user_id)', r.table_name, r.trigger_name;
    execute format('drop trigger if exists %I on public.%I', r.trigger_name, r.table_name);
  end loop;
end $$;

commit;
-- Clerk native integration: rewrite RLS from auth.uid() (uuid) to
-- auth.jwt()->>'sub' (Clerk text id), and change user_id columns to text.
-- Policies must be dropped before the type change because they reference user_id.

begin;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1. DIRECT-OWNERSHIP TABLES (user_id column is the row owner)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- â”€â”€ areas (FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own areas" on areas;
alter table areas alter column user_id type text using user_id::text;
create policy "areas_all_own" on areas
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ goals (FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own goals" on goals;
alter table goals alter column user_id type text using user_id::text;
create policy "goals_all_own" on goals
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ projects (FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own projects" on projects;
alter table projects alter column user_id type text using user_id::text;
create policy "projects_all_own" on projects
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ tasks (4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own tasks" on tasks;
alter table tasks alter column user_id type text using user_id::text;
create policy "tasks_select_own" on tasks
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "tasks_insert_own" on tasks
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "tasks_update_own" on tasks
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "tasks_delete_own" on tasks
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ notes (4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "notes_select_own" on notes;
drop policy if exists "notes_insert_own" on notes;
drop policy if exists "notes_update_own" on notes;
drop policy if exists "notes_delete_own" on notes;
alter table notes alter column user_id type text using user_id::text;
create policy "notes_select_own" on notes
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "notes_insert_own" on notes
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "notes_update_own" on notes
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "notes_delete_own" on notes
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ resources (4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "resources_select_own" on resources;
drop policy if exists "resources_insert_own" on resources;
drop policy if exists "resources_update_own" on resources;
drop policy if exists "resources_delete_own" on resources;
alter table resources alter column user_id type text using user_id::text;
create policy "resources_select_own" on resources
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "resources_insert_own" on resources
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "resources_update_own" on resources
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "resources_delete_own" on resources
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ topics (4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "topics_select_own" on topics;
drop policy if exists "topics_insert_own" on topics;
drop policy if exists "topics_update_own" on topics;
drop policy if exists "topics_delete_own" on topics;
alter table topics alter column user_id type text using user_id::text;
create policy "topics_select_own" on topics
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "topics_insert_own" on topics
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "topics_update_own" on topics
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "topics_delete_own" on topics
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ contacts (FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can manage own contacts" on contacts;
alter table contacts alter column user_id type text using user_id::text;
create policy "contacts_all_own" on contacts
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ contact_logs (FOR ALL with USING + WITH CHECK) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can manage their own contact logs" on contact_logs;
alter table contact_logs alter column user_id type text using user_id::text;
create policy "contact_logs_all_own" on contact_logs
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ note_types (4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "note_types_select_own" on note_types;
drop policy if exists "note_types_insert_own" on note_types;
drop policy if exists "note_types_update_own" on note_types;
drop policy if exists "note_types_delete_own" on note_types;
alter table note_types alter column user_id type text using user_id::text;
create policy "note_types_select_own" on note_types
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "note_types_insert_own" on note_types
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "note_types_update_own" on note_types
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "note_types_delete_own" on note_types
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€ user_settings (4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "user_settings_select_own" on user_settings;
drop policy if exists "user_settings_insert_own" on user_settings;
drop policy if exists "user_settings_update_own" on user_settings;
drop policy if exists "user_settings_delete_own" on user_settings;
alter table user_settings alter column user_id type text using user_id::text;
create policy "user_settings_select_own" on user_settings
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "user_settings_insert_own" on user_settings
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "user_settings_update_own" on user_settings
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "user_settings_delete_own" on user_settings
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2. INDIRECT-OWNERSHIP TABLES (ownership derives from a parent user_id column)
--    After the parent's user_id was widened to text, subqueries against
--    (select auth.jwt()->>'sub') need no cast.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- â”€â”€ goal_projects (via goals) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own goal_projects" on goal_projects;
create policy "goal_projects_all_own" on goal_projects
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_projects.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = goal_projects.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ goal_tasks (via goals) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own goal_tasks" on goal_tasks;
create policy "goal_tasks_all_own" on goal_tasks
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_tasks.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = goal_tasks.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ goal_notes (via goals, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "goal_notes_select_own" on goal_notes;
drop policy if exists "goal_notes_insert_own" on goal_notes;
drop policy if exists "goal_notes_delete_own" on goal_notes;
create policy "goal_notes_select_own" on goal_notes
  for select to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_notes.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_notes_insert_own" on goal_notes
  for insert to authenticated
  with check (exists (
    select 1 from goals
    where goals.id = goal_notes.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_notes_delete_own" on goal_notes
  for delete to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_notes.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ goal_resources (via goals, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "goal_resources_select_own" on goal_resources;
drop policy if exists "goal_resources_insert_own" on goal_resources;
drop policy if exists "goal_resources_delete_own" on goal_resources;
create policy "goal_resources_select_own" on goal_resources
  for select to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_resources.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_resources_insert_own" on goal_resources
  for insert to authenticated
  with check (exists (
    select 1 from goals
    where goals.id = goal_resources.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_resources_delete_own" on goal_resources
  for delete to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_resources.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ goal_areas (via goals, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own goal_areas" on goal_areas;
create policy "goal_areas_all_own" on goal_areas
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_areas.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = goal_areas.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ project_areas (via projects, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own project_areas" on project_areas;
create policy "project_areas_all_own" on project_areas
  for all to authenticated
  using (exists (
    select 1 from projects
    where projects.id = project_areas.project_id
      and projects.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from projects
    where projects.id = project_areas.project_id
      and projects.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ task_areas (via tasks, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own task_areas" on task_areas;
create policy "task_areas_all_own" on task_areas
  for all to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_areas.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from tasks
    where tasks.id = task_areas.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ task_notes (via tasks, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "task_notes_select_own" on task_notes;
drop policy if exists "task_notes_insert_own" on task_notes;
drop policy if exists "task_notes_delete_own" on task_notes;
create policy "task_notes_select_own" on task_notes
  for select to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_notes.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_notes_insert_own" on task_notes
  for insert to authenticated
  with check (exists (
    select 1 from tasks
    where tasks.id = task_notes.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_notes_delete_own" on task_notes
  for delete to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_notes.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ task_resources (via tasks, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "task_resources_select_own" on task_resources;
drop policy if exists "task_resources_insert_own" on task_resources;
drop policy if exists "task_resources_delete_own" on task_resources;
create policy "task_resources_select_own" on task_resources
  for select to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_resources.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_resources_insert_own" on task_resources
  for insert to authenticated
  with check (exists (
    select 1 from tasks
    where tasks.id = task_resources.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_resources_delete_own" on task_resources
  for delete to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_resources.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ task_projects (via tasks, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own task_projects" on task_projects;
create policy "task_projects_all_own" on task_projects
  for all to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_projects.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from tasks
    where tasks.id = task_projects.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ note_areas (via notes, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own note_areas" on note_areas;
create policy "note_areas_all_own" on note_areas
  for all to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_areas.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from notes
    where notes.id = note_areas.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ note_projects (via notes, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "note_projects_select_own" on note_projects;
drop policy if exists "note_projects_insert_own" on note_projects;
drop policy if exists "note_projects_delete_own" on note_projects;
create policy "note_projects_select_own" on note_projects
  for select to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_projects.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_projects_insert_own" on note_projects
  for insert to authenticated
  with check (exists (
    select 1 from notes
    where notes.id = note_projects.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_projects_delete_own" on note_projects
  for delete to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_projects.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ note_related_notes (via notes both sides, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Table was dropped in 20260525000002_drop_note_related_notes.sql; policies
-- do not need to be re-created.

-- â”€â”€ note_notebooks (via notes, 3 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "note_notebooks_select_own" on note_notebooks;
drop policy if exists "note_notebooks_insert_own" on note_notebooks;
drop policy if exists "note_notebooks_delete_own" on note_notebooks;
create policy "note_notebooks_select_own" on note_notebooks
  for select to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_notebooks.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_notebooks_insert_own" on note_notebooks
  for insert to authenticated
  with check (exists (
    select 1 from notes
    where notes.id = note_notebooks.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_notebooks_delete_own" on note_notebooks
  for delete to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_notebooks.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ resource_areas (via resources, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own resource_areas" on resource_areas;
create policy "resource_areas_all_own" on resource_areas
  for all to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_areas.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from resources
    where resources.id = resource_areas.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ resource_projects (via resources, 4 policies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "resource_projects_select_own" on resource_projects;
drop policy if exists "resource_projects_insert_own" on resource_projects;
drop policy if exists "resource_projects_update_own" on resource_projects;
drop policy if exists "resource_projects_delete_own" on resource_projects;
create policy "resource_projects_select_own" on resource_projects
  for select to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));
create policy "resource_projects_insert_own" on resource_projects
  for insert to authenticated
  with check (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));
create policy "resource_projects_update_own" on resource_projects
  for update to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));
create policy "resource_projects_delete_own" on resource_projects
  for delete to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ contact_areas (via contacts, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can manage own contact_area links" on contact_areas;
create policy "contact_areas_all_own" on contact_areas
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_areas.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_areas.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ contact_goals (via contacts, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can manage own contact_goal links" on contact_goals;
create policy "contact_goals_all_own" on contact_goals
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_goals.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_goals.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ contact_projects (via contacts, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can manage own contact_project links" on contact_projects;
create policy "contact_projects_all_own" on contact_projects
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_projects.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_projects.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ contact_tasks (via contacts, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can manage own contact_task links" on contact_tasks;
create policy "contact_tasks_all_own" on contact_tasks
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_tasks.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_tasks.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€ topic_areas (via topics, FOR ALL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Users can only access their own topic_areas" on topic_areas;
create policy "topic_areas_all_own" on topic_areas
  for all to authenticated
  using (exists (
    select 1 from topics
    where topics.id = topic_areas.topic_id
      and topics.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from topics
    where topics.id = topic_areas.topic_id
      and topics.user_id = (select auth.jwt()->>'sub')
  ));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3. STORAGE POLICIES (contact-avatars bucket)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Bucket ownership is encoded in (storage.foldername(name))[1].
-- Rewrite every auth.uid()::text reference to (select auth.jwt()->>'sub').

drop policy if exists "Users can upload their own contact avatars" on storage.objects;
drop policy if exists "Users can update their own contact avatars" on storage.objects;
drop policy if exists "Users can delete their own contact avatars" on storage.objects;
drop policy if exists "Users can view their own contact avatars" on storage.objects;
drop policy if exists "Anyone can view contact avatars" on storage.objects;
drop policy if exists "Public read for contact avatars" on storage.objects;

-- Re-create with current bucket privacy (private) â€” owner-only reads + writes.
-- If you flip the bucket public later, also re-add a "Public read for contact avatars" policy.
create policy "Users can upload their own contact avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users can update their own contact avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users can delete their own contact avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users can view their own contact avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

commit;
-- Backfill user_id columns from old Supabase Auth UUIDs to Clerk user ids.
-- Run AFTER 20260618000001_clerk_rls_rewrite.sql (which widened user_id to text).
--
-- Operator must replace the seed row below with one (old_uuid, clerk_id) pair
-- per preserved user before running `pnpm supabase db push`.

begin;

create temporary table _clerk_user_map (
  old_id text not null,
  new_id text not null
) on commit drop;

-- ONE ROW PER PRESERVED USER. Replace these placeholders with real values
-- before running. The OLD id is the Supabase auth.users.id the user had;
-- the NEW id is the Clerk user id (e.g. 'user_2abc...').
insert into _clerk_user_map (old_id, new_id) values
  ('00000000-0000-0000-0000-000000000000', 'user_REPLACE_ME');

-- Direct-ownership tables â€” must match the table list in 0001 Step 1.
update areas             a set user_id = m.new_id from _clerk_user_map m where a.user_id = m.old_id;
update goals             g set user_id = m.new_id from _clerk_user_map m where g.user_id = m.old_id;
update projects          p set user_id = m.new_id from _clerk_user_map m where p.user_id = m.old_id;
update tasks             t set user_id = m.new_id from _clerk_user_map m where t.user_id = m.old_id;
update notes             n set user_id = m.new_id from _clerk_user_map m where n.user_id = m.old_id;
update resources         r set user_id = m.new_id from _clerk_user_map m where r.user_id = m.old_id;
update topics            tp set user_id = m.new_id from _clerk_user_map m where tp.user_id = m.old_id;
update contacts          c set user_id = m.new_id from _clerk_user_map m where c.user_id = m.old_id;
update contact_logs      cl set user_id = m.new_id from _clerk_user_map m where cl.user_id = m.old_id;
update note_types        nt set user_id = m.new_id from _clerk_user_map m where nt.user_id = m.old_id;
update user_settings     us set user_id = m.new_id from _clerk_user_map m where us.user_id = m.old_id;

commit;
-- Re-create triggers dropped by 20260617500002_drop_user_id_dependent_triggers.sql.
-- The original definitions still work against text user_id: the only uuid
-- cast in ensure_goal_slug_unique() is on the `id` column (still uuid) for
-- a COALESCE default, which is unaffected by the user_id type change.
--
-- Currently known: goal_slug_unique_trigger on goals.
-- ensure_goal_slug_unique() (the function) was NOT dropped, only the trigger
-- was. We re-create the function defensively (create or replace) to lock in
-- the text-compatible form, then re-attach the trigger.

begin;

create or replace function public.ensure_goal_slug_unique()
returns trigger as $$
declare
  existing_count integer;
begin
  if new.slug is null or new.slug = '' then
    raise exception 'Slug cannot be null or empty';
  end if;

  -- user_id is now text (Clerk user id); comparison is text-to-text.
  -- id is still uuid; the COALESCE default is a sentinel uuid.
  select count(*) into existing_count
  from goals
  where user_id = new.user_id
    and slug = new.slug
    and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if existing_count > 0 then
    raise exception 'Duplicate slug for user: %', new.slug;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists goal_slug_unique_trigger on public.goals;
create trigger goal_slug_unique_trigger
  before insert or update of slug, user_id on public.goals
  for each row execute function public.ensure_goal_slug_unique();

commit;
-- Composite unique index on (user_id, slug) for areas.
--
-- The original `areas_slug_key` (slug alone) prevents multi-user data isolation
-- at the schema level: two users cannot both have an area named "Work".
-- Replace with a per-user composite index that mirrors goals/notes/projects/
-- contacts/topics, so each user has their own slug namespace.
--
-- Also enables `onConflict: "user_id,slug"` in onboarding.service.ts upsert
-- (idempotent seed of default areas).
--
-- Existing duplicates across users (if any) are resolved by appending a
-- numeric suffix on conflict; safe because RLS scopes reads per user.

BEGIN;

-- 1. Deduplicate any pre-existing collisions: keep the oldest row, rename
--    later rows by appending a numeric suffix so the new composite index can
--    be created without erroring.
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  new_slug TEXT;
  suffix INT;
BEGIN
  FOR rec IN
    SELECT user_id, slug, id,
           ROW_NUMBER() OVER (PARTITION BY user_id, slug ORDER BY created_at ASC, id ASC) AS rn
    FROM areas
  LOOP
    IF rec.rn > 1 THEN
      base_slug := rec.slug;
      suffix := 1;
      new_slug := base_slug || '-' || suffix;
      WHILE EXISTS (SELECT 1 FROM areas WHERE user_id = rec.user_id AND slug = new_slug AND id <> rec.id) LOOP
        suffix := suffix + 1;
        new_slug := base_slug || '-' || suffix;
      END LOOP;
      UPDATE areas SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- 2. Drop the old single-column unique constraint.
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_slug_key;

-- 3. Create composite unique index on (user_id, slug).
CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_user_slug ON areas(user_id, slug);

COMMIT;
