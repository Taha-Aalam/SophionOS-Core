-- Drop triggers on direct-ownership tables that reference user_id.
-- Required as a prerequisite to 20260618000001_clerk_rls_rewrite.sql, which
-- widens user_id from uuid to text. Postgres refuses to alter a column's
-- type if any trigger definition references the column (in its column list
-- or in the underlying function's source).
--
-- A companion post-rewrite migration
-- (20260619000001_recreate_user_id_dependent_triggers.sql) re-creates the
-- dropped triggers with text-compatible logic.
--
-- Dynamic: queries pg_trigger + pg_proc to find triggers whose column
-- list (in pg_get_triggerdef) or whose function source (pg_proc.prosrc)
-- contains a reference to user_id. Idempotent.

begin;

do $$
declare
  r record;
begin
  for r in
    select
      t.tgname as trigger_name,
      c.relname as table_name,
      pg_get_triggerdef(t.oid) as trigger_def,
      p.prosrc as function_source
    from pg_trigger t
    join pg_class c on t.tgrelid = c.oid
    join pg_proc p on t.tgfoid = p.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and not t.tgisinternal
      and c.relname in (
        'areas', 'goals', 'projects', 'tasks', 'notes', 'resources',
        'topics', 'contacts', 'contact_logs', 'note_types', 'user_settings'
      )
      and (
        pg_get_triggerdef(t.oid) ilike '%user_id%'
        or p.prosrc ilike '%user_id%'
      )
  loop
    raise notice 'dropping trigger %.% (depends on user_id)', r.table_name, r.trigger_name;
    execute format('drop trigger if exists %I on public.%I', r.trigger_name, r.table_name);
  end loop;
end $$;

commit;
