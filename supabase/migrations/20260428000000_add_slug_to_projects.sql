-- Add slug column to projects table
ALTER TABLE projects ADD COLUMN slug TEXT;

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
