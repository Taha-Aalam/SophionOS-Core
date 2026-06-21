-- Backfill default-area icons: replace Lucide name strings with real emojis.
--
-- The original onboarding seed (src/lib/onboarding/default-areas.ts) wrote
-- Lucide icon *names* ("Briefcase", "HeartPulse", ...) into areas.icon,
-- but every consumer renders area.icon as raw text in a <span>. New users
-- now get emojis from the fixed default-areas.ts; this migration repairs
-- existing rows that already carry the broken name strings.
--
-- Safety:
--   * Match by name (one of the 8 seeded defaults) AND icon (one of the 8
--     known-broken Lucide names). User-created areas that happen to share a
--     default name but use a custom emoji are NOT touched.
--   * Skips any row whose icon has already been corrected (or customized).

BEGIN;

UPDATE areas
SET icon = CASE name
    WHEN 'Work'             THEN '💼'
    WHEN 'Health'           THEN '🏥'
    WHEN 'Finances'         THEN '💰'
    WHEN 'Personal Growth'  THEN '📚'
    WHEN 'Family & Friends' THEN '👥'
    WHEN 'Home'             THEN '🏠'
    WHEN 'Travel'           THEN '✈️'
    WHEN 'Career'           THEN '🎯'
  END
WHERE name IN (
    'Work', 'Health', 'Finances', 'Personal Growth',
    'Family & Friends', 'Home', 'Travel', 'Career'
  )
  AND icon IN (
    'Briefcase', 'HeartPulse', 'Wallet', 'BookOpen',
    'Users', 'House', 'Plane', 'TrendingUp'
  );

COMMIT;
