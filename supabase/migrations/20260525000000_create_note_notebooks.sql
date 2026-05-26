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
