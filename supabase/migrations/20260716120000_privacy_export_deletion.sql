-- Privacy Center support: export jobs + account deletion requests.

CREATE TABLE IF NOT EXISTS public.data_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  error_code text,
  file_location text,
  result_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_export_jobs_user_idx
  ON public.data_export_jobs (user_id, requested_at DESC);

ALTER TABLE public.data_export_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users manage own export jobs"
    ON public.data_export_jobs
    FOR ALL
    USING (user_id = auth.jwt() ->> 'sub')
    WITH CHECK (user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL,
  cancelled_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'processing', 'completed', 'failed')),
  failure_code text,
  requested_ip_hash text
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_user_open_uidx
  ON public.account_deletion_requests (clerk_user_id)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_idx
  ON public.account_deletion_requests (clerk_user_id, requested_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users read own deletion requests"
    ON public.account_deletion_requests
    FOR SELECT
    USING (clerk_user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
