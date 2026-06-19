-- Drop policies on indirect-ownership tables that reference user_id columns
-- on the direct-ownership tables. Required as a prerequisite to
-- 20260618000001_clerk_rls_rewrite.sql, which widens user_id from uuid to
-- text. Postgres refuses to alter a column type if any policy references it,
-- even via subquery on a different table.
--
-- The rewrite migration re-creates these policies with Clerk-shaped
-- (select auth.jwt()->>'sub') expressions in its own Section 2, so this
-- drop is safe — the policies come back identical in intent, just rewritten
-- for Clerk's text user id.
--
-- Dynamic: enumerates policies on the known indirect-ownership tables
-- via pg_policy + pg_class, drops them by name. Idempotent.

begin;

do $$
declare
  r record;
begin
  for r in
    select p.polname as policy_name, c.relname as table_name
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname in (
        'goal_projects', 'goal_tasks', 'goal_notes', 'goal_resources', 'goal_areas',
        'project_areas',
        'task_areas', 'task_notes', 'task_resources', 'task_projects',
        'note_areas', 'note_projects', 'note_related_notes', 'note_notebooks',
        'resource_areas', 'resource_projects',
        'contact_areas', 'contact_goals', 'contact_projects', 'contact_tasks',
        'topic_areas'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policy_name, r.table_name);
  end loop;
end $$;

commit;
