-- Backfill last_interaction_at on contacts from their most recent log
-- Applies only where last_interaction_at is currently NULL but logs exist
UPDATE contacts c
SET last_interaction_at = (
  SELECT MAX(logged_at)
  FROM contact_logs cl
  WHERE cl.contact_id = c.id
)
WHERE c.last_interaction_at IS NULL
  AND EXISTS (
    SELECT 1 FROM contact_logs cl WHERE cl.contact_id = c.id
  );
