-- Step 21b: Notes module — Related Notes bidirectional junction table

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
