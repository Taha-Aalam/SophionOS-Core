-- Add slug column to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index per user so two contacts of same user cannot share a slug
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_id_slug_idx ON contacts (user_id, slug)
  WHERE slug IS NOT NULL;

-- Back-fill existing contacts: slug = lower(name) with spaces→hyphens, non-alphanumeric stripped
UPDATE contacts
SET slug = lower(regexp_replace(
  regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
))
WHERE slug IS NULL;

-- Auto-generate slug on insert/update when slug is null
CREATE OR REPLACE FUNCTION contacts_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(
      regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_set_slug_trigger ON contacts;
CREATE TRIGGER contacts_set_slug_trigger
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_set_slug();
