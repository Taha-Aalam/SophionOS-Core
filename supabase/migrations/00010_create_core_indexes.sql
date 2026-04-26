-- Core indexes for performance
CREATE INDEX idx_tasks_user_status_priority ON tasks(user_id, status, priority);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_goals_user_term ON goals(user_id, term);
CREATE INDEX idx_areas_user_archived ON areas(user_id, is_archived);
