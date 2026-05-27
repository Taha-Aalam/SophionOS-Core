-- task_projects: multi-project links for tasks (mirrors task_areas).
-- A task can be linked to one or more projects. The legacy single
-- tasks.project_id remains the "primary" project for backward compat.

CREATE TABLE IF NOT EXISTS task_projects (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_task_projects_task ON task_projects(task_id);
CREATE INDEX IF NOT EXISTS idx_task_projects_project ON task_projects(project_id);

-- Backfill from the single project_id column so existing tasks remain visible
-- under their current project bubble while the new multi-project UI rolls in.
INSERT INTO task_projects (task_id, project_id)
SELECT id, project_id
FROM tasks
WHERE project_id IS NOT NULL
ON CONFLICT (task_id, project_id) DO NOTHING;

ALTER TABLE task_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own task_projects" ON task_projects;
CREATE POLICY "Users can only access their own task_projects" ON task_projects FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM tasks
    WHERE tasks.id = task_projects.task_id
      AND tasks.user_id = auth.uid()
  )
);
