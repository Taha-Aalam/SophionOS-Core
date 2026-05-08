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
