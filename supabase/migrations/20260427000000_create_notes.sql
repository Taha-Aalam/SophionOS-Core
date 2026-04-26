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
