-- Add slug column to areas table
ALTER TABLE areas ADD COLUMN slug TEXT UNIQUE;

-- Generate slugs from existing area names (lowercase, replace spaces with hyphens, remove special chars)
UPDATE areas SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'));
UPDATE areas SET slug = lower(regexp_replace(name, '\s+', '-', 'g'));

-- Make slug column required
ALTER TABLE areas ALTER COLUMN slug SET NOT NULL;

-- Create index on slug for faster lookups
CREATE INDEX idx_areas_slug ON areas(slug);