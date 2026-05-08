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
