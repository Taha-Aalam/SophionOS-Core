-- Drop legacy foreign keys from app tables to auth.users(id).
-- Required as a prerequisite to 20260618000001_clerk_rls_rewrite.sql, which
-- widens user_id from uuid to text. Clerk users do not live in auth.users,
-- so the FK is dropped without a replacement — ownership is now enforced
-- exclusively by RLS policies reading (select auth.jwt()->>'sub').
--
-- Idempotent: drop constraint if exists makes this safe to re-run.
-- Constraint names follow Postgres' default <table>_<col>_fkey pattern;
-- verified against the original 00003_create_areas.sql FK definition.

begin;

alter table areas         drop constraint if exists areas_user_id_fkey;
alter table goals         drop constraint if exists goals_user_id_fkey;
alter table projects      drop constraint if exists projects_user_id_fkey;
alter table tasks         drop constraint if exists tasks_user_id_fkey;
alter table notes         drop constraint if exists notes_user_id_fkey;
alter table resources     drop constraint if exists resources_user_id_fkey;
alter table topics        drop constraint if exists topics_user_id_fkey;
alter table contacts      drop constraint if exists contacts_user_id_fkey;
alter table contact_logs  drop constraint if exists contact_logs_user_id_fkey;
alter table note_types    drop constraint if exists note_types_user_id_fkey;
alter table user_settings drop constraint if exists user_settings_user_id_fkey;

commit;
