-- Seed starter areas exactly once, keyed by a durable per-account marker.
--
-- The old regime ran seedDefaultAreas per login (AuthProvider bootstrap
-- effect). Two flaws, both observed live: a per-login seed resurrects starter
-- areas a user deliberately deleted (it cannot tell "never initialized" from
-- "user pruned their set"), and for users at the Free-tier entity cap the
-- per-login upsert fails outright — the cap trigger fires before Postgres
-- resolves the (user_id, slug) conflict.
--
-- Anchor choice: user_settings' single 'onboarding' row per user. Evidence:
--   * subscriptions is NOT guaranteed — 20260913000001 revokes EXECUTE on
--     provision_subscription() from authenticated, so a new account has no
--     subscriptions row until a billing webhook fires; RLS is SELECT-only.
--   * the 'onboarding' row is read on every sign-in by the (dashboard) layout
--     (userSettingsService.getOnboardingState) and written by the wizard's
--     first step; no account can reach the dashboard without it existing.
--   * a JSON marker inside user_settings.value would be wiped — the wizard's
--     persist() replaces the whole value object — so the marker is a COLUMN.
-- For accounts that never advanced the wizard's first step, the seed RPC
-- creates the anchor row with the marker stamped (same transaction), and the
-- gate treats a missing row exactly like NULL: never initialized.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS areas_seeded_at timestamptz;

COMMENT ON COLUMN user_settings.areas_seeded_at IS
  'Starter-areas seed completion marker (UTC). NULL = never initialized; non-NULL = seeded once. Set one-way in the same transaction as the seed insert; never cleared.';

-- Retroactive backfill: every pre-existing account was initialized under the
-- per-login regime, so stamp its anchor row. Value: the anchor row's own
-- created_at (best available proxy for "when initialization completed").
-- Accounts without an anchor row yet are intentionally left NULL — their next
-- sign-in completes initialization exactly once. Areas data untouched.
UPDATE user_settings
SET areas_seeded_at = created_at
WHERE key = 'onboarding'
  AND areas_seeded_at IS NULL;

-- Exactly-once seed RPC. The caller supplies the DEFAULT_AREAS payload; the
-- owner is derived from the Clerk JWT (never a caller argument). SECURITY
-- INVOKER on purpose: both writes (areas, user_settings) are already covered
-- by the caller's own RLS policies, so no definer surface is added.
CREATE OR REPLACE FUNCTION public.seed_default_areas(p_areas jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id text := (SELECT auth.jwt() ->> 'sub');
  v_stamped boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'seed_default_areas: no authenticated user';
  END IF;

  IF p_areas IS NULL OR jsonb_typeof(p_areas) <> 'array' THEN
    RAISE EXCEPTION 'seed_default_areas: p_areas must be a JSON array';
  END IF;

  -- One-way gate: the seed runs iff the marker IS NULL. A set marker means
  -- initialization completed for this account — deliberately-deleted starter
  -- areas must stay deleted. Nothing gates on area counts or missing rows.
  SELECT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = v_user_id
      AND key = 'onboarding'
      AND areas_seeded_at IS NOT NULL
  ) INTO v_stamped;
  IF v_stamped THEN
    RETURN;
  END IF;

  -- Row-writing unchanged from the old per-login path: same DEFAULT_AREAS
  -- payload shape, same (user_id, slug) ignore-duplicates semantics.
  INSERT INTO public.areas (user_id, name, description, icon, color, type, slug, archive)
  SELECT
    v_user_id,
    area->>'name',
    area->>'description',
    area->>'icon',
    area->>'color',
    area->>'type',
    area->>'slug',
    false
  FROM jsonb_array_elements(p_areas) AS area
  ON CONFLICT (user_id, slug) DO NOTHING;

  -- Stamp the marker in the SAME transaction as the inserts: rows and marker
  -- land together or not at all. Conditional one-way set (WHERE ... IS NULL);
  -- no code path ever clears it. Deleting areas never touches it.
  UPDATE public.user_settings
  SET areas_seeded_at = now()
  WHERE user_id = v_user_id
    AND key = 'onboarding'
    AND areas_seeded_at IS NULL;

  IF NOT FOUND THEN
    -- No anchor row yet (the wizard's first persist hasn't run): create it,
    -- matching the app's DEFAULT_ONBOARDING_STATE so the wizard reads exactly
    -- what it would have read from a missing row. ON CONFLICT covers the
    -- concurrent-stamp race (a parallel seed call won the UPDATE).
    INSERT INTO public.user_settings (user_id, key, value, areas_seeded_at)
    VALUES (
      v_user_id,
      'onboarding',
      '{"completed": false, "current_step": "areas"}'::jsonb,
      now()
    )
    ON CONFLICT (user_id, key) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_areas(jsonb) TO authenticated;
