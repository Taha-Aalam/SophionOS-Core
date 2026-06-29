-- C2: progress/rollup aggregation moved from per-list browser JS into SQL.
--
-- goal.service.hydrateGoalRollupCounts and project.service.hydrateProjectRollupCounts
-- pulled every linked task/note/resource/project row into the browser to count
-- a handful of numbers per row on EVERY list load. The goal path was worse than
-- linear: countFor re-filtered the full link arrays once per goal (O(goals x links)).
--
-- These functions replace that with one round trip returning per-id active
-- counts via SQL group-by/lateral aggregation. They are SECURITY DEFINER (so
-- they bypass RLS) and therefore MUST re-derive ownership from the Clerk subject
-- auth.jwt() ->> 'sub' and scope every child entity to that user, exactly like
-- the rest of the RLS perimeter. They never trust a client-supplied user id.
--
-- "Active" predicates mirror the JS they replace EXACTLY:
--   project : not archived and status <> 'completed'
--   task    : not archived and not completed
--   note    : not archived and status not in ('archive','completed')
--   resource: not archived and status <> 'completed'

DROP FUNCTION IF EXISTS public.goal_progress_summary(uuid[]);
DROP FUNCTION IF EXISTS public.project_progress_summary(uuid[]);

CREATE OR REPLACE FUNCTION public.goal_progress_summary(p_goal_ids uuid[])
returns table (
  goal_id uuid,
  active_project_count integer,
  active_task_count integer,
  active_note_count integer,
  active_resource_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := (select auth.jwt() ->> 'sub');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    g.goal_id,
    coalesce(pc.cnt, 0)::integer as active_project_count,
    coalesce(tc.cnt, 0)::integer as active_task_count,
    coalesce(nc.cnt, 0)::integer as active_note_count,
    coalesce(rc.cnt, 0)::integer as active_resource_count
  from unnest(p_goal_ids) as g(goal_id)
  left join lateral (
    select count(*) as cnt
    from public.goal_projects gp
    join public.projects p on p.id = gp.project_id
    where gp.goal_id = g.goal_id
      and p.user_id = v_user_id
      and p.is_archived = false
      and p.status <> 'completed'
  ) pc on true
  left join lateral (
    select count(*) as cnt
    from public.goal_tasks gt
    join public.tasks t on t.id = gt.task_id
    where gt.goal_id = g.goal_id
      and t.user_id = v_user_id
      and t.is_archived = false
      and t.is_completed = false
  ) tc on true
  left join lateral (
    select count(*) as cnt
    from public.goal_notes gn
    join public.notes n on n.id = gn.note_id
    where gn.goal_id = g.goal_id
      and n.user_id = v_user_id
      and n.is_archived = false
      and n.status <> 'archive'
      and n.status <> 'completed'
  ) nc on true
  left join lateral (
    select count(*) as cnt
    from public.goal_resources gr
    join public.resources r on r.id = gr.resource_id
    where gr.goal_id = g.goal_id
      and r.user_id = v_user_id
      and r.is_archived = false
      and r.status <> 'completed'
  ) rc on true;
end;
$$;

CREATE OR REPLACE FUNCTION public.project_progress_summary(p_project_ids uuid[])
returns table (
  project_id uuid,
  active_task_count integer,
  active_note_count integer,
  active_resource_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := (select auth.jwt() ->> 'sub');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    pr.project_id,
    coalesce(tc.cnt, 0)::integer as active_task_count,
    coalesce(nc.cnt, 0)::integer as active_note_count,
    coalesce(rc.cnt, 0)::integer as active_resource_count
  from unnest(p_project_ids) as pr(project_id)
  -- Tasks reach a project via the project_id FK OR the task_projects junction
  -- (multi-project tasks); count DISTINCT task ids so neither path double-counts.
  left join lateral (
    select count(distinct tid) as cnt
    from (
      select t.id as tid
      from public.tasks t
      where t.project_id = pr.project_id
        and t.user_id = v_user_id
        and t.is_archived = false
        and t.is_completed = false
      union
      select t.id
      from public.task_projects tp
      join public.tasks t on t.id = tp.task_id
      where tp.project_id = pr.project_id
        and t.user_id = v_user_id
        and t.is_archived = false
        and t.is_completed = false
    ) u
  ) tc on true
  -- Notes reach a project via the project_id FK OR the note_projects junction.
  left join lateral (
    select count(distinct nid) as cnt
    from (
      select n.id as nid
      from public.notes n
      where n.project_id = pr.project_id
        and n.user_id = v_user_id
        and n.is_archived = false
        and n.status <> 'archive'
        and n.status <> 'completed'
      union
      select n.id
      from public.note_projects np
      join public.notes n on n.id = np.note_id
      where np.project_id = pr.project_id
        and n.user_id = v_user_id
        and n.is_archived = false
        and n.status <> 'archive'
        and n.status <> 'completed'
    ) u
  ) nc on true
  -- Resources reach a project only via the resource_projects junction.
  left join lateral (
    select count(*) as cnt
    from public.resource_projects rp
    join public.resources r on r.id = rp.resource_id
    where rp.project_id = pr.project_id
      and r.user_id = v_user_id
      and r.is_archived = false
      and r.status <> 'completed'
  ) rc on true;
end;
$$;
