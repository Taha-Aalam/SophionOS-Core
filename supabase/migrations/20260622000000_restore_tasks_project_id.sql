-- Reconcile DB drift: restore tasks.project_id.
--
-- The live database lost tasks.project_id out-of-band (no migration file drops
-- it; the task_projects migration 20260523000000 explicitly preserves it as the
-- "primary project for backward compat"). Every task query reuses TASK_SELECT
-- (src/lib/services/task.service.ts), which lists project_id, so the list GET
-- and create POST both fail with `42703 column "project_id" does not exist`.
-- That empties useTasks() and cascades into goal.service / project.service,
-- whose progress hydration selects `task:tasks(... project_id)`.
--
-- This restores the column to its original definition (00006_create_tasks.sql),
-- re-creates its index, and backfills the primary project from the
-- task_projects junction. Idempotent and additive — safe to re-run.

begin;

alter table tasks
  add column if not exists project_id uuid references projects(id) on delete set null;

create index if not exists idx_tasks_project_id on tasks(project_id);

-- Backfill the primary project from the multi-project junction. A task may link
-- to several projects; the legacy single column holds one "primary", chosen
-- deterministically (lowest project_id) so re-runs are stable.
update tasks t
set project_id = tp.project_id
from (
  select distinct on (task_id) task_id, project_id
  from task_projects
  order by task_id, project_id
) tp
where tp.task_id = t.id
  and t.project_id is null;

commit;
