-- Add slug column to goals table
ALTER TABLE goals ADD COLUMN slug TEXT;

-- Generate slugs from existing goal names
UPDATE goals SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'));
UPDATE goals SET slug = lower(regexp_replace(slug, '\s+', '-', 'g'));

-- Allow null temporarily then make non-null once all are populated
ALTER TABLE goals ALTER COLUMN slug SET NOT NULL;

-- Create index on slug for faster lookups
CREATE INDEX idx_goals_slug ON goals(slug);
