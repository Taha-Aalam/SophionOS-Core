-- Re-create triggers dropped by 20260617500002_drop_user_id_dependent_triggers.sql.
-- The original definitions still work against text user_id: the only uuid
-- cast in ensure_goal_slug_unique() is on the `id` column (still uuid) for
-- a COALESCE default, which is unaffected by the user_id type change.
--
-- Currently known: goal_slug_unique_trigger on goals.
-- ensure_goal_slug_unique() (the function) was NOT dropped, only the trigger
-- was. We re-create the function defensively (create or replace) to lock in
-- the text-compatible form, then re-attach the trigger.

begin;

create or replace function public.ensure_goal_slug_unique()
returns trigger as $$
declare
  existing_count integer;
begin
  if new.slug is null or new.slug = '' then
    raise exception 'Slug cannot be null or empty';
  end if;

  -- user_id is now text (Clerk user id); comparison is text-to-text.
  -- id is still uuid; the COALESCE default is a sentinel uuid.
  select count(*) into existing_count
  from goals
  where user_id = new.user_id
    and slug = new.slug
    and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if existing_count > 0 then
    raise exception 'Duplicate slug for user: %', new.slug;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists goal_slug_unique_trigger on public.goals;
create trigger goal_slug_unique_trigger
  before insert or update of slug, user_id on public.goals
  for each row execute function public.ensure_goal_slug_unique();

commit;
