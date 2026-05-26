-- notes.notebook is fully replaced by the note_notebooks junction table.
ALTER TABLE notes DROP COLUMN IF EXISTS notebook;
