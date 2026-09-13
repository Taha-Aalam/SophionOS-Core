-- Atomic enforcement for MAX_ACTIVE_API_KEYS=5.
-- The application check in generateApiKey (SELECT count then INSERT) is
-- TOCTOU under READ COMMITTED: N concurrent requests can all read the same
-- count and all insert, violating the limit. This trigger serializes per-user
-- inserts with a transaction-scoped advisory lock and enforces the cap inside
-- the database, where it cannot be raced.
CREATE OR REPLACE FUNCTION public.enforce_api_key_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id));
  SELECT count(*) INTO v_count
  FROM public.api_keys
  WHERE user_id = NEW.user_id
    AND revoked_at IS NULL;
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'API_KEY_LIMIT_REACHED: at most 5 active API keys per user'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_api_key_limit ON public.api_keys;
CREATE TRIGGER trg_enforce_api_key_limit
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.enforce_api_key_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_api_key_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_api_key_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_api_key_limit() FROM authenticated;