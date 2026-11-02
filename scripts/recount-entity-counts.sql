-- Idempotent recount repair script.
-- Recomputes user_entity_counts from actual rows across all 7 counted entity tables:
-- areas, goals, projects, tasks, notes, resources, contacts.
-- contact_logs are exempt activity records (owner decision 2026-11-02).
-- Safe to run in production at any time.

WITH entity_union AS (
  SELECT user_id FROM public.areas
  UNION ALL
  SELECT user_id FROM public.goals
  UNION ALL
  SELECT user_id FROM public.projects
  UNION ALL
  SELECT user_id FROM public.tasks
  UNION ALL
  SELECT user_id FROM public.notes
  UNION ALL
  SELECT user_id FROM public.resources
  UNION ALL
  SELECT user_id FROM public.contacts
),
real_counts AS (
  SELECT user_id, count(*)::int AS actual_count
  FROM entity_union
  GROUP BY user_id
),
all_users AS (
  SELECT clerk_user_id AS user_id FROM public.user_entity_counts
  UNION
  SELECT user_id FROM real_counts
),
computed AS (
  SELECT u.user_id, COALESCE(r.actual_count, 0) AS count
  FROM all_users u
  LEFT JOIN real_counts r ON r.user_id = u.user_id
)
INSERT INTO public.user_entity_counts (clerk_user_id, entity_count)
SELECT user_id, count FROM computed
ON CONFLICT (clerk_user_id) DO UPDATE
  SET entity_count = EXCLUDED.entity_count;
