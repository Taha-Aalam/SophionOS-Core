-- Backfill slugs for existing projects based on normalized name, deduplicated per user
WITH normalized AS (
  SELECT
    id,
    user_id,
    name,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) AS base_slug
  FROM projects
  WHERE slug IS NULL
),
ranked AS (
  SELECT
    id,
    user_id,
    name,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY user_id, base_slug ORDER BY id) AS rn
  FROM normalized
)
UPDATE projects
SET slug = (
  CASE
    WHEN ranked.rn = 1 THEN ranked.base_slug
    ELSE ranked.base_slug || '-' || ranked.rn
  END
)
FROM ranked
WHERE projects.id = ranked.id
  AND projects.slug IS NULL;

-- Create the unique index now that slugs are safely backfilled
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_user ON projects(user_id, slug);
