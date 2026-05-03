-- Backfill slugs for existing notes based on normalised name, deduplicated per user
WITH normalized AS (
  SELECT
    id,
    user_id,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) AS base_slug
  FROM notes
  WHERE slug IS NULL
),
ranked AS (
  SELECT
    id,
    user_id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY user_id, base_slug ORDER BY id) AS rn
  FROM normalized
)
UPDATE notes
SET slug = (
  CASE
    WHEN ranked.rn = 1 THEN ranked.base_slug
    ELSE ranked.base_slug || '-' || ranked.rn
  END
)
FROM ranked
WHERE notes.id = ranked.id
  AND notes.slug IS NULL;

-- Unique index now that slugs are safely backfilled
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_slug_user ON notes(user_id, slug);
