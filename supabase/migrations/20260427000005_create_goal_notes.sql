-- Step 20: Goal detail page — note-to-goal linkage
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