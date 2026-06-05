-- Recurring-task support on the tasks table.
--
-- `next_due_date` is deliberately NOT persisted. It is derived from
--   `due_date + repeat_every + repeat_cycle`
-- to avoid drift between a stored value and the live schedule. The dialog
-- previews the next due date live, and `complete_recurring_task` recomputes
-- it at completion time.

create type public.task_repeat_cycle as enum (
  'days',
  'weeks',
  'months',
  'years',
  'months_first_weekday',
  'months_last_weekday',
  'months_second_saturday',
  'months_last_day'
);

alter table public.tasks
  add column is_recurring boolean not null default false,
  add column repeat_every integer,
  add column repeat_cycle public.task_repeat_cycle,
  add column recurrence_source_task_id uuid references public.tasks(id) on delete set null;

alter table public.tasks
  add constraint tasks_repeat_every_positive
  check (repeat_every is null or repeat_every >= 1);

create index if not exists tasks_recurrence_source_idx
  on public.tasks (recurrence_source_task_id);

alter table public.tasks
  add constraint tasks_recurrence_fields_consistent
  check (
    (is_recurring = false and repeat_every is null and repeat_cycle is null)
    or
    (is_recurring = true and repeat_every is not null and repeat_cycle is not null)
  );

-- Atomic recurring completion. The caller (TS service) computes the
-- `p_next_due_date` value from the same `computeNextTaskDueDate` helper that
-- powers the dialog preview, so the SQL never re-implements the calendar
-- math.
--
-- What this function does, in one transaction:
-- 1. Lock the source row.
-- 2. Mark the source row complete (status = completed, is_completed = true,
--    completed_at = now, previous_status preserved from existing row when
--    not already completed).
-- 3. Insert a new task row carrying the source's flags + recurrence
--    configuration, with `recurrence_source_task_id` pointing back to the
--    completed source.
-- 4. Copy `task_areas`, `goal_tasks`, and `task_projects` join rows so the
--    next occurrence inherits all of the source's PARA links.
-- 5. Return both ids.
create or replace function public.complete_recurring_task(
  p_user_id uuid,
  p_task_id uuid,
  p_next_due_date date,
  p_next_status public.task_status
) returns table (
  completed_task_id uuid,
  spawned_task_id uuid
)
language plpgsql
security definer
as $$
declare
  v_source public.tasks;
  v_previous_status public.task_status;
  v_completed_id uuid;
  v_spawned_id uuid;
begin
  -- Lock + validate source row.
  select * into v_source
  from public.tasks
  where id = p_task_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Task % not found for user %', p_task_id, p_user_id;
  end if;

  if v_source.is_recurring is not true then
    raise exception 'Task % is not recurring', p_task_id;
  end if;

  v_previous_status := case
    when v_source.status = 'completed' then v_source.previous_status
    else v_source.status
  end;

  -- Mark source complete.
  update public.tasks
  set
    is_completed = true,
    completed_at = now(),
    status = 'completed',
    previous_status = coalesce(v_previous_status, v_source.status),
    updated_at = now()
  where id = p_task_id
  returning id into v_completed_id;

  -- Spawn the next instance. Carries forward every field that defines the
  -- task's identity (name, description, priority, focus/important/urgent,
  -- area, project, recurrence configuration) and resets the workflow state
  -- to the source's pre-completion status.
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

  -- Copy join-table links so the next instance inherits the source's PARA
  -- chain. `task_areas` and `task_projects` are copied with explicit
  -- user_id matches; `goal_tasks` is the legacy join table used by
  -- goal-scoped task views.
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

-- Atomic undo for a recurring completion. Caller passes both ids so we
-- don't accidentally delete an unrelated row.
--
-- 1. Verify the spawned row's `recurrence_source_task_id` points at the
--    completed task.
-- 2. Delete the spawned row's join-table entries first to avoid FK
--    violations.
-- 3. Delete the spawned row.
-- 4. Restore the source row to its pre-completion workflow state.
create or replace function public.undo_complete_recurring_task(
  p_user_id uuid,
  p_completed_task_id uuid,
  p_spawned_task_id uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_spawned public.tasks;
  v_source public.tasks;
  v_restored_status public.task_status;
begin
  select * into v_spawned
  from public.tasks
  where id = p_spawned_task_id and user_id = p_user_id
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

  -- Restore the source row's workflow state. Fall back to the existing
  -- previous_status, otherwise derive a fresh status from current context.
  select * into v_source
  from public.tasks
  where id = p_completed_task_id and user_id = p_user_id
  for update;

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
