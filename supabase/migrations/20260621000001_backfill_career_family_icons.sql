-- Backfill default-area icons: replace Career (🎯) with (🚀) and
-- Family & Friends (👥) with (👪).
--
-- Previous backfill (20260621000000) wrote the original default emojis,
-- but those collided with the goal and contact card glyphs. This
-- migration updates only the two colliding rows for default-seeded
-- areas, leaving user-customized emoji values untouched.
--
-- Safety:
--   * Match by name (Career / Family & Friends) AND icon (the
--     colliding emoji). User-created areas that share a default name
--     but use a custom emoji are NOT touched.
--   * Skips any row whose icon has already been customized.

BEGIN;

UPDATE areas
SET icon = CASE name
    WHEN 'Career'           THEN '🚀'
    WHEN 'Family & Friends' THEN '👪'
  END
WHERE name IN ('Career', 'Family & Friends')
  AND icon IN ('🎯', '👥');

COMMIT;