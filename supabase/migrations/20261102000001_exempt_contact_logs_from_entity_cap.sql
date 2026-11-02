-- Exempt contact_logs from the Free-tier 100-item entity cap and reconcile counters.
--
-- Owner decision (Taha, 2026-11-02):
-- Contact logs do not count toward the 100-item Free limit. Logs are the
-- contact's activity record — comments on a record — and CRMs do not budget
-- comments. The budgeted unit is the contact itself.
--
-- Actions:
-- 1. Drop the entity-cap trigger trio from contact_logs:
--    - trg_enforce_entity_cap (BEFORE INSERT, guard)
--    - trg_enforce_entity_cap_bump (BEFORE INSERT, bump)
--    - trg_entity_count_delete (AFTER DELETE, decrement)
-- 2. Update recount_entity_counts() to aggregate only across the 7 core counted
--    tables (areas, goals, projects, tasks, notes, resources, contacts).
-- 3. Execute recount_entity_counts() to reconcile existing user_entity_counts.

-- Drop the trigger trio from contact_logs
DROP TRIGGER IF EXISTS trg_enforce_entity_cap ON public.contact_logs;
DROP TRIGGER IF EXISTS trg_enforce_entity_cap_bump ON public.contact_logs;
DROP TRIGGER IF EXISTS trg_entity_count_delete ON public.contact_logs;

-- Update recount_entity_counts() to recount only the 7 core entity tables
CREATE OR REPLACE FUNCTION public.recount_entity_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recount_entity_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recount_entity_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recount_entity_counts() FROM authenticated;

-- Execute the recount repair immediately so counters that included log rows
-- are reconciled on migration apply.
SELECT public.recount_entity_counts();
