-- Expand area types from enum to text to allow custom types
-- Step 1: Change the type column from enum to text with default
ALTER TABLE areas
ALTER COLUMN type TYPE text,
ALTER COLUMN type SET DEFAULT 'personal',
ALTER COLUMN type SET NOT NULL;

-- Step 2: Create index for grouped queries by type
CREATE INDEX IF NOT EXISTS idx_areas_user_type ON areas(user_id, type);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN areas.type IS 'User-defined area type. Default types: Business, Personal, Studies';