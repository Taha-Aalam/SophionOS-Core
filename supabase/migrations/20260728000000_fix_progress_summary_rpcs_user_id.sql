-- C3: progress_summary RPCs fail when called via service_role key because
-- auth.jwt() ->> 'sub' returns null for admin clients. Add optional p_user_id
-- param as fallback so the RPC works both for Clerk JWTs (user sessions) and
-- API-key-authenticated calls (admin client, service_role).
--
-- Callers in project.service.hydrateProjectRollupCounts and
-- goal.service.hydrateGoalRollupCounts now pass userId when available;
-- the original auth.jwt() path remains the default when p_user_id is null.

DROP FUNCTION IF EXISTS public.goal_progress_summary(uuid[]);
DROP FUNCTION IF EXISTS public.project_progress_summary(uuid[]);

CREATE OR REPLACE FUNCTION public.goal_progress_summary(
  p_goal_ids uuid[],
  p_user_id text default null
)
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
  v_user_id text := coalesce((select auth.jwt() ->> 'sub'), p_user_id);
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

CREATE OR REPLACE FUNCTION public.project_progress_summary(
  p_project_ids uuid[],
  p_user_id text default null
)
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
  v_user_id text := coalesce((select auth.jwt() ->> 'sub'), p_user_id);
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
