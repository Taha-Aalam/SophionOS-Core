-- Add slug column to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slugs for existing topics using name
UPDATE topics
SET slug = base_slug
FROM (
  SELECT
    id,
    lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g')) as base_slug
  FROM topics
  WHERE slug IS NULL OR slug = ''
) AS base
WHERE topics.id = base.id;

-- Handle duplicate slugs within each user
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug TEXT;
BEGIN
  FOR rec IN
    SELECT t.id, t.user_id, t.slug, t.name, COUNT(*) OVER (PARTITION BY user_id, slug) as cnt
    FROM topics t
    WHERE t.slug IS NOT NULL AND t.slug != ''
  LOOP
    IF rec.cnt > 1 THEN
      counter := 1;
      new_slug := rec.slug || '-' || counter::TEXT;

      WHILE EXISTS (
        SELECT 1 FROM topics
        WHERE user_id = rec.user_id
          AND slug = new_slug
          AND id != rec.id
      ) LOOP
        counter := counter + 1;
        new_slug := rec.slug || '-' || counter::TEXT;
      END LOOP;

      UPDATE topics SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END
$$;

-- Create unique index (per user)
CREATE UNIQUE INDEX IF NOT EXISTS topics_user_slug_idx ON topics(user_id, slug) WHERE slug IS NOT NULL;