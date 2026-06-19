-- Clerk native integration: rewrite RLS from auth.uid() (uuid) to
-- auth.jwt()->>'sub' (Clerk text id), and change user_id columns to text.
-- Policies must be dropped before the type change because they reference user_id.

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. DIRECT-OWNERSHIP TABLES (user_id column is the row owner)
-- ────────────────────────────────────────────────────────────────────────────

-- ── areas (FOR ALL) ─────────────────────────────────────────────────────────
drop policy if exists "Users can only access their own areas" on areas;
alter table areas alter column user_id type text using user_id::text;
create policy "areas_all_own" on areas
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- ── goals (FOR ALL) ─────────────────────────────────────────────────────────
drop policy if exists "Users can only access their own goals" on goals;
alter table goals alter column user_id type text using user_id::text;
create policy "goals_all_own" on goals
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- ── projects (FOR ALL) ──────────────────────────────────────────────────────
drop policy if exists "Users can only access their own projects" on projects;
alter table projects alter column user_id type text using user_id::text;
create policy "projects_all_own" on projects
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- ── tasks (4 policies) ──────────────────────────────────────────────────────
drop policy if exists "Users can only access their own tasks" on tasks;
alter table tasks alter column user_id type text using user_id::text;
create policy "tasks_select_own" on tasks
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "tasks_insert_own" on tasks
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "tasks_update_own" on tasks
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "tasks_delete_own" on tasks
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- ── notes (4 policies) ──────────────────────────────────────────────────────
drop policy if exists "notes_select_own" on notes;
drop policy if exists "notes_insert_own" on notes;
drop policy if exists "notes_update_own" on notes;
drop policy if exists "notes_delete_own" on notes;
alter table notes alter column user_id type text using user_id::text;
create policy "notes_select_own" on notes
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "notes_insert_own" on notes
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "notes_update_own" on notes
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "notes_delete_own" on notes
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- ── resources (4 policies) ───────────────────────────────────────────────────
drop policy if exists "resources_select_own" on resources;
drop policy if exists "resources_insert_own" on resources;
drop policy if exists "resources_update_own" on resources;
drop policy if exists "resources_delete_own" on resources;
alter table resources alter column user_id type text using user_id::text;
create policy "resources_select_own" on resources
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "resources_insert_own" on resources
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "resources_update_own" on resources
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "resources_delete_own" on resources
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- ── topics (4 policies) ─────────────────────────────────────────────────────
drop policy if exists "topics_select_own" on topics;
drop policy if exists "topics_insert_own" on topics;
drop policy if exists "topics_update_own" on topics;
drop policy if exists "topics_delete_own" on topics;
alter table topics alter column user_id type text using user_id::text;
create policy "topics_select_own" on topics
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "topics_insert_own" on topics
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "topics_update_own" on topics
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "topics_delete_own" on topics
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- ── contacts (FOR ALL) ──────────────────────────────────────────────────────
drop policy if exists "Users can manage own contacts" on contacts;
alter table contacts alter column user_id type text using user_id::text;
create policy "contacts_all_own" on contacts
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- ── contact_logs (FOR ALL with USING + WITH CHECK) ──────────────────────────
drop policy if exists "Users can manage their own contact logs" on contact_logs;
alter table contact_logs alter column user_id type text using user_id::text;
create policy "contact_logs_all_own" on contact_logs
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- ── note_types (4 policies) ─────────────────────────────────────────────────
drop policy if exists "note_types_select_own" on note_types;
drop policy if exists "note_types_insert_own" on note_types;
drop policy if exists "note_types_update_own" on note_types;
drop policy if exists "note_types_delete_own" on note_types;
alter table note_types alter column user_id type text using user_id::text;
create policy "note_types_select_own" on note_types
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "note_types_insert_own" on note_types
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "note_types_update_own" on note_types
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "note_types_delete_own" on note_types
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- ── user_settings (4 policies) ──────────────────────────────────────────────
drop policy if exists "user_settings_select_own" on user_settings;
drop policy if exists "user_settings_insert_own" on user_settings;
drop policy if exists "user_settings_update_own" on user_settings;
drop policy if exists "user_settings_delete_own" on user_settings;
alter table user_settings alter column user_id type text using user_id::text;
create policy "user_settings_select_own" on user_settings
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "user_settings_insert_own" on user_settings
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "user_settings_update_own" on user_settings
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "user_settings_delete_own" on user_settings
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. INDIRECT-OWNERSHIP TABLES (ownership derives from a parent user_id column)
--    After the parent's user_id was widened to text, subqueries against
--    (select auth.jwt()->>'sub') need no cast.
-- ────────────────────────────────────────────────────────────────────────────

-- ── goal_projects (via goals) ───────────────────────────────────────────────
drop policy if exists "Users can only access their own goal_projects" on goal_projects;
create policy "goal_projects_all_own" on goal_projects
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_projects.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = goal_projects.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- ── goal_tasks (via goals) ──────────────────────────────────────────────────
drop policy if exists "Users can only access their own goal_tasks" on goal_tasks;
create policy "goal_tasks_all_own" on goal_tasks
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_tasks.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = goal_tasks.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- ── goal_notes (via goals, 3 policies) ──────────────────────────────────────
drop policy if exists "goal_notes_select_own" on goal_notes;
drop policy if exists "goal_notes_insert_own" on goal_notes;
drop policy if exists "goal_notes_delete_own" on goal_notes;
create policy "goal_notes_select_own" on goal_notes
  for select to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_notes.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_notes_insert_own" on goal_notes
  for insert to authenticated
  with check (exists (
    select 1 from goals
    where goals.id = goal_notes.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_notes_delete_own" on goal_notes
  for delete to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_notes.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- ── goal_resources (via goals, 3 policies) ─────────────────────────────────
drop policy if exists "goal_resources_select_own" on goal_resources;
drop policy if exists "goal_resources_insert_own" on goal_resources;
drop policy if exists "goal_resources_delete_own" on goal_resources;
create policy "goal_resources_select_own" on goal_resources
  for select to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_resources.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_resources_insert_own" on goal_resources
  for insert to authenticated
  with check (exists (
    select 1 from goals
    where goals.id = goal_resources.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
create policy "goal_resources_delete_own" on goal_resources
  for delete to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_resources.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- ── goal_areas (via goals, FOR ALL) ─────────────────────────────────────────
drop policy if exists "Users can only access their own goal_areas" on goal_areas;
create policy "goal_areas_all_own" on goal_areas
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = goal_areas.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = goal_areas.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));

-- ── project_areas (via projects, FOR ALL) ───────────────────────────────────
drop policy if exists "Users can only access their own project_areas" on project_areas;
create policy "project_areas_all_own" on project_areas
  for all to authenticated
  using (exists (
    select 1 from projects
    where projects.id = project_areas.project_id
      and projects.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from projects
    where projects.id = project_areas.project_id
      and projects.user_id = (select auth.jwt()->>'sub')
  ));

-- ── task_areas (via tasks, FOR ALL) ─────────────────────────────────────────
drop policy if exists "Users can only access their own task_areas" on task_areas;
create policy "task_areas_all_own" on task_areas
  for all to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_areas.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from tasks
    where tasks.id = task_areas.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- ── task_notes (via tasks, 3 policies) ──────────────────────────────────────
drop policy if exists "task_notes_select_own" on task_notes;
drop policy if exists "task_notes_insert_own" on task_notes;
drop policy if exists "task_notes_delete_own" on task_notes;
create policy "task_notes_select_own" on task_notes
  for select to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_notes.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_notes_insert_own" on task_notes
  for insert to authenticated
  with check (exists (
    select 1 from tasks
    where tasks.id = task_notes.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_notes_delete_own" on task_notes
  for delete to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_notes.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- ── task_resources (via tasks, 3 policies) ──────────────────────────────────
drop policy if exists "task_resources_select_own" on task_resources;
drop policy if exists "task_resources_insert_own" on task_resources;
drop policy if exists "task_resources_delete_own" on task_resources;
create policy "task_resources_select_own" on task_resources
  for select to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_resources.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_resources_insert_own" on task_resources
  for insert to authenticated
  with check (exists (
    select 1 from tasks
    where tasks.id = task_resources.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));
create policy "task_resources_delete_own" on task_resources
  for delete to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_resources.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- ── task_projects (via tasks, FOR ALL) ──────────────────────────────────────
drop policy if exists "Users can only access their own task_projects" on task_projects;
create policy "task_projects_all_own" on task_projects
  for all to authenticated
  using (exists (
    select 1 from tasks
    where tasks.id = task_projects.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from tasks
    where tasks.id = task_projects.task_id
      and tasks.user_id = (select auth.jwt()->>'sub')
  ));

-- ── note_areas (via notes, FOR ALL) ─────────────────────────────────────────
drop policy if exists "Users can only access their own note_areas" on note_areas;
create policy "note_areas_all_own" on note_areas
  for all to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_areas.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from notes
    where notes.id = note_areas.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));

-- ── note_projects (via notes, 3 policies) ───────────────────────────────────
drop policy if exists "note_projects_select_own" on note_projects;
drop policy if exists "note_projects_insert_own" on note_projects;
drop policy if exists "note_projects_delete_own" on note_projects;
create policy "note_projects_select_own" on note_projects
  for select to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_projects.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_projects_insert_own" on note_projects
  for insert to authenticated
  with check (exists (
    select 1 from notes
    where notes.id = note_projects.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_projects_delete_own" on note_projects
  for delete to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_projects.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));

-- ── note_related_notes (via notes both sides, 3 policies) ───────────────────
-- Table was dropped in 20260525000002_drop_note_related_notes.sql; policies
-- do not need to be re-created.

-- ── note_notebooks (via notes, 3 policies) ──────────────────────────────────
drop policy if exists "note_notebooks_select_own" on note_notebooks;
drop policy if exists "note_notebooks_insert_own" on note_notebooks;
drop policy if exists "note_notebooks_delete_own" on note_notebooks;
create policy "note_notebooks_select_own" on note_notebooks
  for select to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_notebooks.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_notebooks_insert_own" on note_notebooks
  for insert to authenticated
  with check (exists (
    select 1 from notes
    where notes.id = note_notebooks.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));
create policy "note_notebooks_delete_own" on note_notebooks
  for delete to authenticated
  using (exists (
    select 1 from notes
    where notes.id = note_notebooks.note_id
      and notes.user_id = (select auth.jwt()->>'sub')
  ));

-- ── resource_areas (via resources, FOR ALL) ─────────────────────────────────
drop policy if exists "Users can only access their own resource_areas" on resource_areas;
create policy "resource_areas_all_own" on resource_areas
  for all to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_areas.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from resources
    where resources.id = resource_areas.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));

-- ── resource_projects (via resources, 4 policies) ───────────────────────────
drop policy if exists "resource_projects_select_own" on resource_projects;
drop policy if exists "resource_projects_insert_own" on resource_projects;
drop policy if exists "resource_projects_update_own" on resource_projects;
drop policy if exists "resource_projects_delete_own" on resource_projects;
create policy "resource_projects_select_own" on resource_projects
  for select to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));
create policy "resource_projects_insert_own" on resource_projects
  for insert to authenticated
  with check (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));
create policy "resource_projects_update_own" on resource_projects
  for update to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));
create policy "resource_projects_delete_own" on resource_projects
  for delete to authenticated
  using (exists (
    select 1 from resources
    where resources.id = resource_projects.resource_id
      and resources.user_id = (select auth.jwt()->>'sub')
  ));

-- ── contact_areas (via contacts, FOR ALL) ───────────────────────────────────
drop policy if exists "Users can manage own contact_area links" on contact_areas;
create policy "contact_areas_all_own" on contact_areas
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_areas.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_areas.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- ── contact_goals (via contacts, FOR ALL) ───────────────────────────────────
drop policy if exists "Users can manage own contact_goal links" on contact_goals;
create policy "contact_goals_all_own" on contact_goals
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_goals.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_goals.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- ── contact_projects (via contacts, FOR ALL) ────────────────────────────────
drop policy if exists "Users can manage own contact_project links" on contact_projects;
create policy "contact_projects_all_own" on contact_projects
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_projects.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_projects.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- ── contact_tasks (via contacts, FOR ALL) ───────────────────────────────────
drop policy if exists "Users can manage own contact_task links" on contact_tasks;
create policy "contact_tasks_all_own" on contact_tasks
  for all to authenticated
  using (exists (
    select 1 from contacts
    where contacts.id = contact_tasks.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from contacts
    where contacts.id = contact_tasks.contact_id
      and contacts.user_id = (select auth.jwt()->>'sub')
  ));

-- ── topic_areas (via topics, FOR ALL) ───────────────────────────────────────
drop policy if exists "Users can only access their own topic_areas" on topic_areas;
create policy "topic_areas_all_own" on topic_areas
  for all to authenticated
  using (exists (
    select 1 from topics
    where topics.id = topic_areas.topic_id
      and topics.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from topics
    where topics.id = topic_areas.topic_id
      and topics.user_id = (select auth.jwt()->>'sub')
  ));

-- ────────────────────────────────────────────────────────────────────────────
-- 3. STORAGE POLICIES (contact-avatars bucket)
-- ────────────────────────────────────────────────────────────────────────────

-- Bucket ownership is encoded in (storage.foldername(name))[1].
-- Rewrite every auth.uid()::text reference to (select auth.jwt()->>'sub').

drop policy if exists "Users can upload their own contact avatars" on storage.objects;
drop policy if exists "Users can update their own contact avatars" on storage.objects;
drop policy if exists "Users can delete their own contact avatars" on storage.objects;
drop policy if exists "Users can view their own contact avatars" on storage.objects;
drop policy if exists "Anyone can view contact avatars" on storage.objects;
drop policy if exists "Public read for contact avatars" on storage.objects;

-- Re-create with current bucket privacy (private) — owner-only reads + writes.
-- If you flip the bucket public later, also re-add a "Public read for contact avatars" policy.
create policy "Users can upload their own contact avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users can update their own contact avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users can delete their own contact avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy "Users can view their own contact avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'contact-avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

commit;
