-- Security hardening
--
-- C1: contact_projects / contact_tasks had policies defined in
--     20260427000003_create_contacts.sql but ENABLE ROW LEVEL SECURITY was
--     never run, so the policies were inert and the tables were fully exposed
--     to any authenticated user. Enable RLS now.
--
-- C2: topic_areas (20260427000002_create_topics.sql) had neither RLS enabled
--     nor any policy. Enable RLS and add an ownership policy via the parent
--     topic.
--
-- H1: complete_recurring_task / undo_complete_recurring_task are
--     SECURITY DEFINER and scoped on a client-supplied p_user_id. A caller
--     could pass another user's id. Re-derive identity from auth.uid() and
--     drop the p_user_id parameter.

-- ─── C1: enable RLS on contact join tables (policies already exist) ──────────
ALTER TABLE contact_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tasks ENABLE ROW LEVEL SECURITY;

-- ─── C2: topic_areas — enable RLS and add ownership policy ───────────────────
ALTER TABLE topic_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own topic_areas" ON topic_areas;
CREATE POLICY "Users can only access their own topic_areas" ON topic_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM topics
      WHERE topics.id = topic_areas.topic_id
        AND topics.user_id = auth.uid()
    )
  );

-- ─── H1: harden recurring-task RPCs to use auth.uid() ────────────────────────
-- Signature changes (p_user_id removed) require dropping the old functions.
DROP FUNCTION IF EXISTS public.complete_recurring_task(uuid, uuid, date, public.task_status);
DROP FUNCTION IF EXISTS public.undo_complete_recurring_task(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.complete_recurring_task(
  p_task_id uuid,
  p_next_due_date date,
  p_next_status public.task_status
) returns table (
  completed_task_id uuid,
  spawned_task_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.tasks;
  v_previous_status public.task_status;
  v_completed_id uuid;
  v_spawned_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock + validate source row (scoped to the authenticated user).
  select * into v_source
  from public.tasks
  where id = p_task_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Task % not found for current user', p_task_id;
  end if;

  if v_source.is_recurring is not true then
    raise exception 'Task % is not recurring', p_task_id;
  end if;

  v_previous_status := case
    when v_source.status = 'completed' then v_source.previous_status
    else v_source.status
  end;

  update public.tasks
  set
    is_completed = true,
    completed_at = now(),
    status = 'completed',
    previous_status = coalesce(v_previous_status, v_source.status),
    updated_at = now()
  where id = p_task_id
  returning id into v_completed_id;

  insert into public.tasks (
    user_id,
    area_id,
    project_id,
    name,
    description,
    status,
    priority,
    due_date,
    is_completed,
    is_focused,
    is_important,
    is_urgent,
    completed_at,
    previous_status,
    smart_priority,
    is_archived,
    is_recurring,
    repeat_every,
    repeat_cycle,
    recurrence_source_task_id
  ) values (
    v_source.user_id,
    v_source.area_id,
    v_source.project_id,
    v_source.name,
    v_source.description,
    coalesce(p_next_status, v_previous_status, v_source.status, 'todo'),
    v_source.priority,
    p_next_due_date,
    false,
    v_source.is_focused,
    v_source.is_important,
    v_source.is_urgent,
    null,
    null,
    v_source.smart_priority,
    false,
    true,
    v_source.repeat_every,
    v_source.repeat_cycle,
    v_source.id
  )
  returning id into v_spawned_id;

  insert into public.task_areas (task_id, area_id)
  select v_spawned_id, area_id
  from public.task_areas
  where task_id = v_source.id
  on conflict do nothing;

  insert into public.task_projects (task_id, project_id)
  select v_spawned_id, project_id
  from public.task_projects
  where task_id = v_source.id
  on conflict do nothing;

  insert into public.goal_tasks (task_id, goal_id)
  select v_spawned_id, goal_id
  from public.goal_tasks
  where task_id = v_source.id
  on conflict do nothing;

  completed_task_id := v_completed_id;
  spawned_task_id := v_spawned_id;
  return next;
end;
$$;

CREATE OR REPLACE FUNCTION public.undo_complete_recurring_task(
  p_completed_task_id uuid,
  p_spawned_task_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_spawned public.tasks;
  v_source public.tasks;
  v_restored_status public.task_status;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_spawned
  from public.tasks
  where id = p_spawned_task_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Spawned task % not found', p_spawned_task_id;
  end if;

  if v_spawned.recurrence_source_task_id is distinct from p_completed_task_id then
    raise exception 'Spawned task % is not linked to completed task %', p_spawned_task_id, p_completed_task_id;
  end if;

  delete from public.task_areas where task_id = p_spawned_task_id;
  delete from public.task_projects where task_id = p_spawned_task_id;
  delete from public.goal_tasks where task_id = p_spawned_task_id;
  delete from public.tasks where id = p_spawned_task_id;

  select * into v_source
  from public.tasks
  where id = p_completed_task_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Completed task % not found for current user', p_completed_task_id;
  end if;

  v_restored_status := coalesce(v_source.previous_status, 'todo');

  update public.tasks
  set
    is_completed = false,
    completed_at = null,
    status = v_restored_status,
    previous_status = null,
    updated_at = now()
  where id = p_completed_task_id;

  return p_completed_task_id;
end;
$$;
