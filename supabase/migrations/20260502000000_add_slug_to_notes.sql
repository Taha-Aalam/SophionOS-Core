-- Add slug column to notes table
ALTER TABLE notes ADD COLUMN slug TEXT;

-- Index for fast slug lookups per user
CREATE INDEX IF NOT EXISTS idx_notes_slug ON notes(slug);
