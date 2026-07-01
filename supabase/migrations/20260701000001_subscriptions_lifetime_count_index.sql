-- Tier wall A2: lifetime-cap support.
--
-- The launch offer is "Lifetime ($150 one-time, Max-forever) for the first 100
-- subscribers only." That cap is enforced at BILLING time (the future Dodo
-- webhook), NOT here and NOT in the API/trigger layer. All this migration does
-- is make the global count cheap so the webhook can run, inside its purchase
-- transaction:
--
--   SELECT count(*) FROM subscriptions WHERE tier = 'lifetime';
--   -- if >= 100, reject the lifetime purchase (offer sold out) and fall back
--   -- to the recurring 'max' tier.
--
-- A partial index over just the lifetime rows keeps that count O(matching rows)
-- instead of a full-table scan, and stays tiny (<=100 entries by design).

CREATE INDEX IF NOT EXISTS idx_subscriptions_lifetime
  ON subscriptions (tier)
  WHERE tier = 'lifetime';
