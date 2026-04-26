-- RLS Policies
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own areas" ON areas FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goals" ON goals FOR ALL USING (auth.uid() = user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own projects" ON projects FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goal_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goal_projects" ON goal_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid())
);

ALTER TABLE goal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goal_tasks" ON goal_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid())
);
