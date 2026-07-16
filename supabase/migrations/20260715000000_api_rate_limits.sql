-- Shared API rate-limit counters (multi-instance safe).
-- Only the service-role path (admin client) calls check_api_rate_limit.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window
  ON public.api_rate_limits (window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon — only service_role / DEFINER touch this table.

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_user_id TEXT,
  p_limit INT,
  p_window_ms INT DEFAULT 60000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
  v_limit INT := GREATEST(COALESCE(p_limit, 100), 1);
  v_window INT := GREATEST(COALESCE(p_window_ms, 60000), 1000);
BEGIN
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RETURN json_build_object('success', false, 'limit', v_limit, 'remaining', 0);
  END IF;

  -- Fixed window aligned to epoch multiples of v_window ms.
  v_window_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) * 1000 / v_window) * v_window / 1000.0
  );

  INSERT INTO public.api_rate_limits (user_id, window_start, request_count)
  VALUES (p_user_id, v_window_start, 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET request_count = public.api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  IF v_count > v_limit THEN
    RETURN json_build_object('success', false, 'limit', v_limit, 'remaining', 0);
  END IF;

  RETURN json_build_object(
    'success', true,
    'limit', v_limit,
    'remaining', GREATEST(v_limit - v_count, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_api_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_api_rate_limit(TEXT, INT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.check_api_rate_limit(TEXT, INT, INT) FROM authenticated;
-- service_role executes via PostgREST admin client
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(TEXT, INT, INT) TO service_role;
