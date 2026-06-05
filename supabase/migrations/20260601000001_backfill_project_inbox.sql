-- Re-flag existing contextless projects (no linked area AND no linked goal) that
-- are still sitting at the old fake-inbox status 'planning' as the real 'inbox'.
UPDATE projects p
SET status = 'inbox'
WHERE p.status = 'planning'
  AND NOT EXISTS (SELECT 1 FROM project_areas pa WHERE pa.project_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM goal_projects gp WHERE gp.project_id = p.id);
