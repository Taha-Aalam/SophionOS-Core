-- Reconcile stale 'inbox' statuses on rows that already have organizing context.
-- A previous version of the create dialog submitted status='inbox' unconditionally
-- when a user picked an area/project/goal/topic in the same session, leaving the
-- status out of sync with the context. Flip them to the derived value.

-- Tasks: inbox -> todo when the task has an area or project.
UPDATE tasks t
SET status = 'todo'
WHERE t.status = 'inbox'
  AND (
    t.area_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM task_areas ta WHERE ta.task_id = t.id)
    OR EXISTS (SELECT 1 FROM task_projects tp WHERE tp.task_id = t.id)
  );

-- Notes: inbox -> to_review when the note has any context.
UPDATE notes n
SET status = 'to_review'
WHERE n.status = 'inbox'
  AND (
    n.area_id IS NOT NULL
    OR n.project_id IS NOT NULL
    OR n.topic_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM note_areas na WHERE na.note_id = n.id)
    OR EXISTS (SELECT 1 FROM goal_notes gn WHERE gn.note_id = n.id)
    OR EXISTS (SELECT 1 FROM note_projects np WHERE np.note_id = n.id)
  );

-- Resources: inbox -> to_review when the resource has any context.
UPDATE resources r
SET status = 'to_review'
WHERE r.status = 'inbox'
  AND (
    r.area_id IS NOT NULL
    OR r.project_id IS NOT NULL
    OR r.topic_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM resource_areas ra WHERE ra.resource_id = r.id)
    OR EXISTS (SELECT 1 FROM goal_resources gr WHERE gr.resource_id = r.id)
  );
