  -- 1. Ensure slug column exists (should already exist)
  ALTER TABLE areas ADD COLUMN IF NOT EXISTS slug TEXT;

  -- 2. Populate any missing slugs for existing areas
  UPDATE areas
  SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'))
  WHERE slug IS NULL;

  UPDATE areas
  SET slug = lower(regexp_replace(slug, '\s+', '-', 'g'))
  WHERE slug IS NOT NULL;

  -- 3. Fix any remaining nulls to avoid constraint errors
  UPDATE areas SET slug = 'area-' || id WHERE slug IS NULL;

  -- 4. Ensure the column is NOT NULL (it might already be, but this ensures it)
  -- We use a do block to avoid error if already set
  DO $$
  BEGIN
      ALTER TABLE areas ALTER COLUMN slug SET NOT NULL;
  EXCEPTION
      WHEN others THEN RAISE NOTICE 'slug column already NOT NULL';
  END $$;

  -- 5. Create index if it doesn't exist
  CREATE INDEX IF NOT EXISTS idx_areas_slug ON areas(slug);