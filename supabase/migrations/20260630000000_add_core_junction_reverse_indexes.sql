-- Reverse-direction indexes for the two original core junction tables.
--
-- goal_projects and goal_tasks (migration 00007) were created with ONLY a
-- composite primary key: PRIMARY KEY (goal_id, project_id) and
-- (goal_id, task_id). A composite PK can serve lookups on its LEADING column
-- (goal_id) but NOT on the trailing column. Every junction table created
-- afterwards (project_areas, goal_areas, note_projects, resource_projects, …)
-- got an index in BOTH directions; these two were missed.
--
-- The trailing columns are queried directly in hot read paths:
--   - hydrateProjectGoalLinks / projects.queries: goal_projects WHERE project_id IN (...)
--   - tasks hydration / area-detail: goal_tasks WHERE task_id IN (...)
--   - project/goal detail unlink + count paths: WHERE project_id = / task_id =
-- Without these indexes those filters fall back to a sequential scan that
-- grows linearly with the user base (the table is global, not per-user), so it
-- looks instant in dev and degrades under production row counts + concurrency.
--
-- Plain CREATE INDEX (not CONCURRENTLY) to match existing migration style and
-- because Supabase wraps each migration in a transaction; these tables are
-- small today so the brief lock is negligible.

CREATE INDEX IF NOT EXISTS idx_goal_projects_project ON goal_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_task ON goal_tasks(task_id);
