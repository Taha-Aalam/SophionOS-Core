-- Reconcile project inbox status when the primary `projects.area_id`
-- column is populated. The previous reconcile only checked junction tables
-- (`project_areas` / `goal_projects`); the `deriveProjectStatus` helper
-- also considers the primary `area_id` column, so projects linked via
-- `replaceAreaLinks` (which writes `projects.area_id` directly) were
-- missed. Flip those rows to `planning`.

UPDATE projects p
SET status = 'planning'
WHERE p.status = 'inbox'
  AND p.area_id IS NOT NULL;
