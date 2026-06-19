-- Composite unique index on (user_id, slug) for areas.
--
-- The original `areas_slug_key` (slug alone) prevents multi-user data isolation
-- at the schema level: two users cannot both have an area named "Work".
-- Replace with a per-user composite index that mirrors goals/notes/projects/
-- contacts/topics, so each user has their own slug namespace.
--
-- Also enables `onConflict: "user_id,slug"` in onboarding.service.ts upsert
-- (idempotent seed of default areas).
--
-- Existing duplicates across users (if any) are resolved by appending a
-- numeric suffix on conflict; safe because RLS scopes reads per user.

BEGIN;

-- 1. Deduplicate any pre-existing collisions: keep the oldest row, rename
--    later rows by appending a numeric suffix so the new composite index can
--    be created without erroring.
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  new_slug TEXT;
  suffix INT;
BEGIN
  FOR rec IN
    SELECT user_id, slug, id,
           ROW_NUMBER() OVER (PARTITION BY user_id, slug ORDER BY created_at ASC, id ASC) AS rn
    FROM areas
  LOOP
    IF rec.rn > 1 THEN
      base_slug := rec.slug;
      suffix := 1;
      new_slug := base_slug || '-' || suffix;
      WHILE EXISTS (SELECT 1 FROM areas WHERE user_id = rec.user_id AND slug = new_slug AND id <> rec.id) LOOP
        suffix := suffix + 1;
        new_slug := base_slug || '-' || suffix;
      END LOOP;
      UPDATE areas SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- 2. Drop the old single-column unique constraint.
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_slug_key;

-- 3. Create composite unique index on (user_id, slug).
CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_user_slug ON areas(user_id, slug);

COMMIT;
