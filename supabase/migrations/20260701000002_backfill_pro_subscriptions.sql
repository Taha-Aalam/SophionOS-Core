-- Tier wall A3: provisioning backfill.
--
-- Launch posture: every existing user is granted Pro (walls are built and
-- enforced but non-disruptive today). The future Dodo billing step flips the
-- default to free + enforces real entitlements.
--
-- subscriptions.user_id is TEXT holding the Clerk user id (post 20260618 RLS
-- rewrite). Source the distinct user set from the union of every user-data
-- table — a user with rows in any table but no user_settings row still gets
-- provisioned. ON CONFLICT keeps this idempotent and safe to re-run.

INSERT INTO subscriptions (user_id, tier, status)
SELECT DISTINCT uid, 'pro', 'active'
FROM (
  SELECT user_id AS uid FROM user_settings
  UNION SELECT user_id FROM areas
  UNION SELECT user_id FROM goals
  UNION SELECT user_id FROM projects
  UNION SELECT user_id FROM tasks
  UNION SELECT user_id FROM notes
  UNION SELECT user_id FROM resources
  UNION SELECT user_id FROM topics
  UNION SELECT user_id FROM contacts
) AS all_users
WHERE uid IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
