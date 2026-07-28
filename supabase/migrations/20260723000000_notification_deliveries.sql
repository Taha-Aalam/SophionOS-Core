-- notification_deliveries: idempotent send log for scheduled briefs

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  kind text NOT NULL
    CHECK (kind IN ('morning_briefing', 'evening_review', 'weekly_digest')),
  channel text NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email')),
  local_date date NOT NULL,
  status text NOT NULL
    CHECK (status IN ('sent', 'failed', 'skipped')),
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One logical delivery attempt outcome per user/kind/day/channel for success path.
-- Failed rows may retry: unique only on successful/skipped terminal statuses via partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_success_uidx
  ON public.notification_deliveries (user_id, kind, local_date, channel)
  WHERE status IN ('sent', 'skipped');

CREATE INDEX IF NOT EXISTS notification_deliveries_user_created_idx
  ON public.notification_deliveries (user_id, created_at DESC);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users read own notification deliveries"
    ON public.notification_deliveries
    FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- No INSERT/UPDATE/DELETE policies for JWT users: only service-role cron writes.
