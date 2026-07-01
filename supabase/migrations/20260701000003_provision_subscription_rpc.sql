-- Tier wall A4: auto-provision a Pro subscription for new users on first run.
--
-- The browser data path is supabase-js + Clerk JWT + RLS. subscriptions
-- intentionally exposes ONLY a SELECT policy (tier is server-authority data),
-- so a client cannot insert its own row — and we must NOT add an open INSERT
-- policy, or a user could self-grant tier='max'.
--
-- Instead expose a SECURITY DEFINER RPC that:
--   * derives the user id from auth.jwt()->>'sub' (NEVER a caller-supplied arg,
--     so the caller can't provision someone else), and
--   * hardcodes tier='pro' / status='active' (caller can't pick a tier).
-- ON CONFLICT keeps it idempotent against React StrictMode double-effects.

CREATE OR REPLACE FUNCTION public.provision_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := (SELECT auth.jwt() ->> 'sub');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'provision_subscription: no authenticated user';
  END IF;

  INSERT INTO subscriptions (user_id, tier, status)
  VALUES (v_user_id, 'pro', 'active')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_subscription() TO authenticated;
