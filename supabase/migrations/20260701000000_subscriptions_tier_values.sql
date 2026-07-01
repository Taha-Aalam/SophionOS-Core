-- Tier wall A1: extend subscriptions.tier to the launch tier set and retire
-- the legacy 'premium' value.
--
-- Tiers:
--   free     -- $0, 100-entity cap, no API/MCP
--   pro      -- $15/mo, unlimited, API + MCP
--   lifetime -- $150 one-time, Max-forever access, never expires (status stays
--               'active', current_period_end ignored). Launch offer capped at
--               the first 100 subscribers; that cap is enforced at billing time
--               (deferred), not here.
--   max      -- post-launch recurring tier; treated as equivalent to lifetime
--               for entitlement checks.
--
-- Nothing wrote to this table before the tier wall, so the only legacy value in
-- flight is the default 'premium' placeholder from the original enum comment.
-- Map any stray 'premium' rows to 'pro' before locking the allowed set.

UPDATE subscriptions SET tier = 'pro' WHERE tier = 'premium';

-- Lock the allowed tier set. Drop first so the migration is re-runnable.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'pro', 'lifetime', 'max'));
