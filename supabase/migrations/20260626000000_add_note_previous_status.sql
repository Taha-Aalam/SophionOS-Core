--- Remembers the status a note held before it was completed, so un-completing
--- can restore it. Nullable; only set while a note is in the completed state.
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS previous_status note_status;
