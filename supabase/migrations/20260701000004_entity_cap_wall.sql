-- Tier wall Phase D: Wall 1 — the 100-entity cap for Free-tier users.
--
-- The dashboard writes straight to Postgres (browser supabase-js + Clerk JWT +
-- RLS) and bypasses /api/v1, so this wall MUST live in the database, not the
-- API layer. A running counter table + AFTER INSERT/DELETE triggers maintain
-- the count; a BEFORE INSERT trigger enforces the cap for Free users only.
--
-- Counted tables (D2): the 7 core entities + contact_logs. note_notebooks is
-- EXCLUDED: it has no user_id (composite PK (note_id, notebook), owner resolved
-- via notes) — it is structurally a junction, and D3 excludes junction rows.
-- Counting notebook tags would also let a user burn the cap on tags alone.
-- All 8 counted tables carry a TEXT user_id (Clerk sub) post-RLS-rewrite, so
-- the triggers read NEW.user_id / OLD.user_id directly — no parent resolution.
--
-- Provisioning today makes everyone tier=pro, so this cap is built but inert
-- until billing flips the default to free. It is enforced for any free row.

-- D1: running per-user entity counter.
CREATE TABLE IF NOT EXISTS user_entity_counts (
  clerk_user_id TEXT PRIMARY KEY,
  entity_count INT NOT NULL DEFAULT 0
);

ALTER TABLE user_entity_counts ENABLE ROW LEVEL SECURITY;

-- Read-only to the owner; only the SECURITY DEFINER functions below mutate it
-- (no INSERT/UPDATE policy, mirroring subscriptions — counts are server data).
DO $$
BEGIN
  CREATE POLICY "Users read their own entity count"
    ON user_entity_counts FOR SELECT
    USING (clerk_user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- D3: upsert helper. SECURITY DEFINER so the maintenance triggers can write the
-- counter regardless of the caller's RLS context. Floors at 0 so a stray DELETE
-- can never drive the count negative.
CREATE OR REPLACE FUNCTION public.bump_entity_count(p_user_id TEXT, p_delta INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO user_entity_counts (clerk_user_id, entity_count)
  VALUES (p_user_id, GREATEST(p_delta, 0))
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET entity_count = GREATEST(user_entity_counts.entity_count + p_delta, 0);
END;
$$;

-- SECURITY: bump_entity_count is DEFINER and trusts a caller-supplied user id,
-- so it MUST NOT be directly callable by clients — a free user could otherwise
-- rpc('bump_entity_count', {p_user_id: self, p_delta: -100}) to reset their
-- count and defeat the cap. Only the maintenance triggers (themselves DEFINER)
-- invoke it. Explicitly revoke EXECUTE from PUBLIC + the app roles; the grant is
-- never given to authenticated in the first place, but revoke to be certain
-- regardless of the DB's default-privilege posture.
REVOKE EXECUTE ON FUNCTION public.bump_entity_count(TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_entity_count(TEXT, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_entity_count(TEXT, INT) FROM anon;

-- D4: maintenance trigger functions. AFTER INSERT bumps +1, AFTER DELETE −1.
CREATE OR REPLACE FUNCTION public.entity_count_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bump_entity_count(NEW.user_id, 1);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.entity_count_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bump_entity_count(OLD.user_id, -1);
  RETURN OLD;
END;
$$;

-- D5: enforcement trigger function. BEFORE INSERT, Free-tier only. A missing or
-- non-active subscription row resolves to 'free' (fail-closed, same rule as the
-- API getTier). The count is read BEFORE the AFTER-INSERT bump, so a free user
-- passes on counts 0..99 and is blocked at 100 (the 101st row).
CREATE OR REPLACE FUNCTION public.enforce_entity_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_count INT;
BEGIN
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = NEW.user_id AND status = 'active';

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  IF v_tier = 'free' THEN
    SELECT entity_count INTO v_count
    FROM user_entity_counts
    WHERE clerk_user_id = NEW.user_id;

    IF COALESCE(v_count, 0) >= 100 THEN
      RAISE EXCEPTION 'ENTITY_LIMIT_REACHED'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- D4 + D5: wire triggers onto each counted table. Idempotent via DROP IF EXISTS.
DO $$
DECLARE
  t TEXT;
  counted_tables TEXT[] := ARRAY[
    'areas', 'goals', 'projects', 'tasks',
    'notes', 'resources', 'contacts', 'contact_logs'
  ];
BEGIN
  FOREACH t IN ARRAY counted_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_entity_cap ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_entity_cap BEFORE INSERT ON %I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_cap()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_entity_count_insert ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_entity_count_insert AFTER INSERT ON %I
         FOR EACH ROW EXECUTE FUNCTION public.entity_count_on_insert()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_entity_count_delete ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_entity_count_delete AFTER DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION public.entity_count_on_delete()', t);
  END LOOP;
END $$;

-- D6: backfill the counter for existing users (sum across the 8 counted tables).
INSERT INTO user_entity_counts (clerk_user_id, entity_count)
SELECT user_id, COUNT(*)::int
FROM (
  SELECT user_id FROM areas
  UNION ALL SELECT user_id FROM goals
  UNION ALL SELECT user_id FROM projects
  UNION ALL SELECT user_id FROM tasks
  UNION ALL SELECT user_id FROM notes
  UNION ALL SELECT user_id FROM resources
  UNION ALL SELECT user_id FROM contacts
  UNION ALL SELECT user_id FROM contact_logs
) AS counted
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT (clerk_user_id) DO UPDATE
  SET entity_count = EXCLUDED.entity_count;
