-- Per-user subscription tier driving API rate limits. A user with no row
-- defaults to the 'free' tier (the rate limiter treats a missing row as free).
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',     -- free | pro | premium
  status TEXT NOT NULL DEFAULT 'active',  -- active | past_due | canceled
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users read their own subscription"
    ON subscriptions FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
