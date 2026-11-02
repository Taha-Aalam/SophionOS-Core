-- Duplicate-aware entity-cap bump and recount repair.
--
-- Background:
-- The entity cap guard was duplicate-aware, but the bump remained
-- duplicate-blind: every idempotent re-proposal (such as onboarding seed
-- re-proposal under ON CONFLICT DO NOTHING) bumped the counter even though zero
-- rows were added.
--
-- The fix:
-- 1. Serialize counter mutations using per-user advisory xact lock
--    ('entity_cap:' || user_id) in enforce_entity_cap and bump_entity_count.
-- 2. Wire the bump as a BEFORE INSERT trigger (trg_enforce_entity_cap_bump)
--    with duplicate-awareness mirroring enforce_entity_cap.
--    Trigger name order ensures cap check runs before bump:
--    trg_enforce_entity_cap < trg_enforce_entity_cap_bump.
-- 3. Provide an idempotent recount repair function (recount_entity_counts)
--    covering all 8 counted tables, run at migration apply.

-- Serialize bump_entity_count with transaction advisory lock
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

  PERFORM pg_advisory_xact_lock(hashtext('entity_cap:' || p_user_id));

  INSERT INTO user_entity_counts (clerk_user_id, entity_count)
  VALUES (p_user_id, GREATEST(p_delta, 0))
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET entity_count = GREATEST(user_entity_counts.entity_count + p_delta, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bump_entity_count(TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_entity_count(TEXT, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_entity_count(TEXT, INT) FROM anon;

-- Update cap check with transaction advisory lock
CREATE OR REPLACE FUNCTION public.enforce_entity_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_count INT;
  v_conflicting BOOLEAN;
  v_user_id TEXT := to_jsonb(NEW) ->> 'user_id';
  v_row_id UUID := (to_jsonb(NEW) ->> 'id')::uuid;
  v_slug TEXT := to_jsonb(NEW) ->> 'slug';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('entity_cap:' || v_user_id));

  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = v_user_id AND status = 'active';

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  IF v_tier = 'free' THEN
    v_conflicting :=
      CASE TG_TABLE_NAME
        WHEN 'areas' THEN
          EXISTS (SELECT 1 FROM public.areas
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.areas WHERE id = v_row_id)
        WHEN 'goals' THEN
          EXISTS (SELECT 1 FROM public.goals
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.goals WHERE id = v_row_id)
        WHEN 'projects' THEN
          EXISTS (SELECT 1 FROM public.projects
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.projects WHERE id = v_row_id)
        WHEN 'notes' THEN
          EXISTS (SELECT 1 FROM public.notes
                  WHERE user_id = v_user_id AND slug = v_slug)
          OR EXISTS (SELECT 1 FROM public.notes WHERE id = v_row_id)
        WHEN 'contacts' THEN
          (v_slug IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.contacts
             WHERE user_id = v_user_id AND slug = v_slug))
          OR EXISTS (SELECT 1 FROM public.contacts WHERE id = v_row_id)
        WHEN 'tasks' THEN
          EXISTS (SELECT 1 FROM public.tasks WHERE id = v_row_id)
        WHEN 'resources' THEN
          EXISTS (SELECT 1 FROM public.resources WHERE id = v_row_id)
        WHEN 'contact_logs' THEN
          EXISTS (SELECT 1 FROM public.contact_logs WHERE id = v_row_id)
        ELSE FALSE
      END;

    IF v_conflicting THEN
      RETURN NEW;
    END IF;

    SELECT entity_count INTO v_count
    FROM user_entity_counts
    WHERE clerk_user_id = v_user_id;

    IF COALESCE(v_count, 0) >= 100 THEN
      RAISE EXCEPTION 'ENTITY_LIMIT_REACHED'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Duplicate-aware BEFORE INSERT bump trigger function
CREATE OR REPLACE FUNCTION public.enforce_entity_cap_bump()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflicting BOOLEAN;
  v_user_id TEXT := to_jsonb(NEW) ->> 'user_id';
  v_row_id UUID := (to_jsonb(NEW) ->> 'id')::uuid;
  v_slug TEXT := to_jsonb(NEW) ->> 'slug';
BEGIN
  v_conflicting :=
    CASE TG_TABLE_NAME
      WHEN 'areas' THEN
        EXISTS (SELECT 1 FROM public.areas
                WHERE user_id = v_user_id AND slug = v_slug)
        OR EXISTS (SELECT 1 FROM public.areas WHERE id = v_row_id)
      WHEN 'goals' THEN
        EXISTS (SELECT 1 FROM public.goals
                WHERE user_id = v_user_id AND slug = v_slug)
        OR EXISTS (SELECT 1 FROM public.goals WHERE id = v_row_id)
      WHEN 'projects' THEN
        EXISTS (SELECT 1 FROM public.projects
                WHERE user_id = v_user_id AND slug = v_slug)
        OR EXISTS (SELECT 1 FROM public.projects WHERE id = v_row_id)
      WHEN 'notes' THEN
        EXISTS (SELECT 1 FROM public.notes
                WHERE user_id = v_user_id AND slug = v_slug)
        OR EXISTS (SELECT 1 FROM public.notes WHERE id = v_row_id)
      WHEN 'contacts' THEN
        (v_slug IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.contacts
           WHERE user_id = v_user_id AND slug = v_slug))
        OR EXISTS (SELECT 1 FROM public.contacts WHERE id = v_row_id)
      WHEN 'tasks' THEN
        EXISTS (SELECT 1 FROM public.tasks WHERE id = v_row_id)
      WHEN 'resources' THEN
        EXISTS (SELECT 1 FROM public.resources WHERE id = v_row_id)
      WHEN 'contact_logs' THEN
        EXISTS (SELECT 1 FROM public.contact_logs WHERE id = v_row_id)
      ELSE FALSE
    END;

  IF v_conflicting THEN
    RETURN NEW;
  END IF;

  PERFORM public.bump_entity_count(NEW.user_id, 1);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_entity_cap_bump() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_entity_cap_bump() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_entity_cap_bump() FROM authenticated;

-- Rewire triggers across all 8 counted tables
DO $$
DECLARE
  t TEXT;
  counted_tables TEXT[] := ARRAY[
    'areas', 'goals', 'projects', 'tasks',
    'notes', 'resources', 'contacts', 'contact_logs'
  ];
BEGIN
  FOREACH t IN ARRAY counted_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_entity_count_insert ON %I', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_entity_cap ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_entity_cap BEFORE INSERT ON %I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_cap()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_entity_cap_bump ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_entity_cap_bump BEFORE INSERT ON %I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_cap_bump()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_entity_count_delete ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_entity_count_delete AFTER DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION public.entity_count_on_delete()', t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.entity_count_on_insert();

-- Recount repair: recomputes user_entity_counts from actual rows across all
-- eight counted entity tables.
CREATE OR REPLACE FUNCTION public.recount_entity_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH entity_union AS (
    SELECT user_id FROM public.areas
    UNION ALL
    SELECT user_id FROM public.goals
    UNION ALL
    SELECT user_id FROM public.projects
    UNION ALL
    SELECT user_id FROM public.tasks
    UNION ALL
    SELECT user_id FROM public.notes
    UNION ALL
    SELECT user_id FROM public.resources
    UNION ALL
    SELECT user_id FROM public.contacts
    UNION ALL
    SELECT user_id FROM public.contact_logs
  ),
  real_counts AS (
    SELECT user_id, count(*)::int AS actual_count
    FROM entity_union
    GROUP BY user_id
  ),
  all_users AS (
    SELECT clerk_user_id AS user_id FROM public.user_entity_counts
    UNION
    SELECT user_id FROM real_counts
  ),
  computed AS (
    SELECT u.user_id, COALESCE(r.actual_count, 0) AS count
    FROM all_users u
    LEFT JOIN real_counts r ON r.user_id = u.user_id
  )
  INSERT INTO public.user_entity_counts (clerk_user_id, entity_count)
  SELECT user_id, count FROM computed
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET entity_count = EXCLUDED.entity_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recount_entity_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recount_entity_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recount_entity_counts() FROM authenticated;

-- Reconcile counters immediately on migration apply
SELECT public.recount_entity_counts();
