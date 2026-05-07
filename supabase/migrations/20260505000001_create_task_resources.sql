-- Junction table to link resources to tasks

CREATE TABLE task_resources (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, resource_id)
);

ALTER TABLE task_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_resources_select_own" ON task_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "task_resources_insert_own" ON task_resources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "task_resources_delete_own" ON task_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_resources.task_id
        AND tasks.user_id = auth.uid()
    )
  );

CREATE INDEX idx_task_resources_task ON task_resources(task_id);
CREATE INDEX idx_task_resources_resource ON task_resources(resource_id);
