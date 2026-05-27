-- Step: Task-to-project linkage
-- Junction table to link tasks to multiple projects (powers multi-project tasks)

CREATE TABLE task_projects (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, project_id)
);

ALTER TABLE task_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_projects_select_own" ON task_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_projects.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "task_projects_insert_own" ON task_projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_projects.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "task_projects_delete_own" ON task_projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_projects.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE INDEX idx_task_projects_task ON task_projects(task_id);
CREATE INDEX idx_task_projects_project ON task_projects(project_id);

-- Backfill from existing task.project_id
INSERT INTO task_projects (task_id, project_id)
SELECT id, project_id
FROM tasks
WHERE project_id IS NOT NULL
ON CONFLICT (task_id, project_id) DO NOTHING;
