-- Step 20: Goal detail page — resource-to-goal linkage
-- Junction table to link resources to goals (powers goal-scoped Resources section)

CREATE TABLE goal_resources (
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, resource_id)
);

ALTER TABLE goal_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_resources_select_own" ON goal_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_resources.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_resources_insert_own" ON goal_resources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_resources.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_resources_delete_own" ON goal_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_resources.goal_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE INDEX idx_goal_resources_goal ON goal_resources(goal_id);
CREATE INDEX idx_goal_resources_resource ON goal_resources(resource_id);