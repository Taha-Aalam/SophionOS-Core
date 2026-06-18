-- Backfill user_id columns from old Supabase Auth UUIDs to Clerk user ids.
-- Run AFTER 20260618000001_clerk_rls_rewrite.sql (which widened user_id to text).
--
-- Operator must replace the seed row below with one (old_uuid, clerk_id) pair
-- per preserved user before running `pnpm supabase db push`.

begin;

create temporary table _clerk_user_map (
  old_id text not null,
  new_id text not null
) on commit drop;

-- ONE ROW PER PRESERVED USER. Replace these placeholders with real values
-- before running. The OLD id is the Supabase auth.users.id the user had;
-- the NEW id is the Clerk user id (e.g. 'user_2abc...').
insert into _clerk_user_map (old_id, new_id) values
  ('00000000-0000-0000-0000-000000000000', 'user_REPLACE_ME');

-- Direct-ownership tables — must match the table list in 0001 Step 1.
update areas             a set user_id = m.new_id from _clerk_user_map m where a.user_id = m.old_id;
update goals             g set user_id = m.new_id from _clerk_user_map m where g.user_id = m.old_id;
update projects          p set user_id = m.new_id from _clerk_user_map m where p.user_id = m.old_id;
update tasks             t set user_id = m.new_id from _clerk_user_map m where t.user_id = m.old_id;
update notes             n set user_id = m.new_id from _clerk_user_map m where n.user_id = m.old_id;
update resources         r set user_id = m.new_id from _clerk_user_map m where r.user_id = m.old_id;
update topics            tp set user_id = m.new_id from _clerk_user_map m where tp.user_id = m.old_id;
update contacts          c set user_id = m.new_id from _clerk_user_map m where c.user_id = m.old_id;
update contact_logs      cl set user_id = m.new_id from _clerk_user_map m where cl.user_id = m.old_id;
update note_types        nt set user_id = m.new_id from _clerk_user_map m where nt.user_id = m.old_id;
update user_settings     us set user_id = m.new_id from _clerk_user_map m where us.user_id = m.old_id;

commit;
