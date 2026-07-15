-- Optional audit log for billing webhook events (idempotency + forensics).

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  user_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON public.billing_events (user_id);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- No client policies: service-role / webhook only.
