-- Backfill slugs for goals that have null/empty slugs
-- and ensure slug uniqueness per user using a unique index + trigger

-- Step 1: Backfill null slugs (created between migration and now)
UPDATE goals
SET slug = base_slug
FROM (
  SELECT
    id,
    lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g')) as base_slug
  FROM goals
  WHERE slug IS NULL OR slug = ''
) AS base
WHERE goals.id = base.id;

-- Step 2: Detect and fix duplicate slugs within each user
-- For each user, assign collision-safe slugs to duplicate-name goals
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug TEXT;
BEGIN
  FOR rec IN
    SELECT g.id, g.user_id, g.slug, g.name, COUNT(*) OVER (PARTITION BY user_id, slug) as cnt
    FROM goals g
    WHERE g.slug IS NOT NULL AND g.slug != ''
  LOOP
    IF rec.cnt > 1 THEN
      -- Get existing slugs with same base for this user
      counter := 1;
      new_slug := rec.slug || '-' || counter::TEXT;

      -- Find a unique slot
      WHILE EXISTS (
        SELECT 1 FROM goals
        WHERE user_id = rec.user_id
          AND slug = new_slug
          AND id != rec.id
      ) LOOP
        counter := counter + 1;
        new_slug := rec.slug || '-' || counter::TEXT;
      END LOOP;

      UPDATE goals SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$;

-- Step 3: Add unique constraint per user via partial unique index
-- PostgreSQL doesn't support filtered unique indexes, so use a trigger instead
CREATE OR REPLACE FUNCTION ensure_goal_slug_unique()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RAISE EXCEPTION 'Slug cannot be null or empty';
  END IF;

  SELECT COUNT(*) INTO existing_count
  FROM goals
  WHERE user_id = NEW.user_id
    AND slug = NEW.slug
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Duplicate slug for user: %', NEW.slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goal_slug_unique_trigger ON goals;
CREATE TRIGGER goal_slug_unique_trigger
BEFORE INSERT OR UPDATE OF slug, user_id ON goals
FOR EACH ROW EXECUTE FUNCTION ensure_goal_slug_unique();

-- Clean up the old non-unique index (optional, can keep for read-only help)
-- DROP INDEX IF EXISTS idx_goals_slug;

-- Create a unique index (will fail if duplicates exist after backfill fix above)
-- This confirms the data is clean
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_slug_user ON goals(user_id, slug);