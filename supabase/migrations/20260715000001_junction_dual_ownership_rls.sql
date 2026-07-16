-- SEC-2026-001: Dual-ownership WITH CHECK / USING on all multi-entity junctions.
-- Inserts/updates must prove the caller owns EVERY linked parent, not only one side.

BEGIN;

-- ── goal_projects ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "goal_projects_all_own" ON goal_projects;
CREATE POLICY "goal_projects_all_own" ON goal_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_projects.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = goal_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_projects.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = goal_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── goal_tasks ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "goal_tasks_all_own" ON goal_tasks;
CREATE POLICY "goal_tasks_all_own" ON goal_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_tasks.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = goal_tasks.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_tasks.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = goal_tasks.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── goal_notes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "goal_notes_select_own" ON goal_notes;
DROP POLICY IF EXISTS "goal_notes_insert_own" ON goal_notes;
DROP POLICY IF EXISTS "goal_notes_delete_own" ON goal_notes;
CREATE POLICY "goal_notes_select_own" ON goal_notes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_notes.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM notes n WHERE n.id = goal_notes.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "goal_notes_insert_own" ON goal_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_notes.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM notes n WHERE n.id = goal_notes.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "goal_notes_delete_own" ON goal_notes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_notes.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM notes n WHERE n.id = goal_notes.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── goal_resources ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "goal_resources_select_own" ON goal_resources;
DROP POLICY IF EXISTS "goal_resources_insert_own" ON goal_resources;
DROP POLICY IF EXISTS "goal_resources_delete_own" ON goal_resources;
CREATE POLICY "goal_resources_select_own" ON goal_resources FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_resources.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM resources r WHERE r.id = goal_resources.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "goal_resources_insert_own" ON goal_resources FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_resources.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM resources r WHERE r.id = goal_resources.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "goal_resources_delete_own" ON goal_resources FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_resources.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM resources r WHERE r.id = goal_resources.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── goal_areas ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "goal_areas_all_own" ON goal_areas;
CREATE POLICY "goal_areas_all_own" ON goal_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_areas.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = goal_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_areas.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = goal_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── project_areas ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "project_areas_all_own" ON project_areas;
CREATE POLICY "project_areas_all_own" ON project_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_areas.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = project_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_areas.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = project_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── task_areas ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "task_areas_all_own" ON task_areas;
CREATE POLICY "task_areas_all_own" ON task_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_areas.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = task_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_areas.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = task_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── task_notes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "task_notes_select_own" ON task_notes;
DROP POLICY IF EXISTS "task_notes_insert_own" ON task_notes;
DROP POLICY IF EXISTS "task_notes_delete_own" ON task_notes;
CREATE POLICY "task_notes_select_own" ON task_notes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_notes.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM notes n WHERE n.id = task_notes.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "task_notes_insert_own" ON task_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_notes.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM notes n WHERE n.id = task_notes.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "task_notes_delete_own" ON task_notes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_notes.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM notes n WHERE n.id = task_notes.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── task_resources ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "task_resources_select_own" ON task_resources;
DROP POLICY IF EXISTS "task_resources_insert_own" ON task_resources;
DROP POLICY IF EXISTS "task_resources_delete_own" ON task_resources;
CREATE POLICY "task_resources_select_own" ON task_resources FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_resources.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM resources r WHERE r.id = task_resources.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "task_resources_insert_own" ON task_resources FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_resources.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM resources r WHERE r.id = task_resources.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "task_resources_delete_own" ON task_resources FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_resources.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM resources r WHERE r.id = task_resources.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── task_projects ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "task_projects_all_own" ON task_projects;
CREATE POLICY "task_projects_all_own" ON task_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_projects.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = task_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_projects.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = task_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── note_areas ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "note_areas_all_own" ON note_areas;
CREATE POLICY "note_areas_all_own" ON note_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_areas.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = note_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_areas.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = note_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── note_projects ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "note_projects_select_own" ON note_projects;
DROP POLICY IF EXISTS "note_projects_insert_own" ON note_projects;
DROP POLICY IF EXISTS "note_projects_delete_own" ON note_projects;
CREATE POLICY "note_projects_select_own" ON note_projects FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_projects.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = note_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "note_projects_insert_own" ON note_projects FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_projects.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = note_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "note_projects_delete_own" ON note_projects FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_projects.note_id AND n.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = note_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── resource_areas ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "resource_areas_all_own" ON resource_areas;
CREATE POLICY "resource_areas_all_own" ON resource_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_areas.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = resource_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_areas.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = resource_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── resource_projects ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "resource_projects_select_own" ON resource_projects;
DROP POLICY IF EXISTS "resource_projects_insert_own" ON resource_projects;
DROP POLICY IF EXISTS "resource_projects_update_own" ON resource_projects;
DROP POLICY IF EXISTS "resource_projects_delete_own" ON resource_projects;
CREATE POLICY "resource_projects_select_own" ON resource_projects FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_projects.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = resource_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "resource_projects_insert_own" ON resource_projects FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_projects.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = resource_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "resource_projects_update_own" ON resource_projects FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_projects.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = resource_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_projects.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = resource_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );
CREATE POLICY "resource_projects_delete_own" ON resource_projects FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM resources r WHERE r.id = resource_projects.resource_id AND r.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = resource_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── contact_areas ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact_areas_all_own" ON contact_areas;
CREATE POLICY "contact_areas_all_own" ON contact_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_areas.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = contact_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_areas.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM areas a WHERE a.id = contact_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── contact_goals ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact_goals_all_own" ON contact_goals;
CREATE POLICY "contact_goals_all_own" ON contact_goals
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_goals.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM goals g WHERE g.id = contact_goals.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_goals.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM goals g WHERE g.id = contact_goals.goal_id AND g.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── contact_projects ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact_projects_all_own" ON contact_projects;
CREATE POLICY "contact_projects_all_own" ON contact_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_projects.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = contact_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_projects.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = contact_projects.project_id AND p.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── contact_tasks ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact_tasks_all_own" ON contact_tasks;
CREATE POLICY "contact_tasks_all_own" ON contact_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_tasks.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = contact_tasks.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_tasks.contact_id AND c.user_id = (SELECT auth.jwt()->>'sub'))
    AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = contact_tasks.task_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
  );

-- ── topic_areas (if present) ────────────────────────────────────────────────
DROP POLICY IF EXISTS "topic_areas_all_own" ON topic_areas;
DROP POLICY IF EXISTS "Users can only access their own topic_areas" ON topic_areas;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'topic_areas'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "topic_areas_all_own" ON topic_areas
        FOR ALL TO authenticated
        USING (
          EXISTS (SELECT 1 FROM topics t WHERE t.id = topic_areas.topic_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
          AND EXISTS (SELECT 1 FROM areas a WHERE a.id = topic_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM topics t WHERE t.id = topic_areas.topic_id AND t.user_id = (SELECT auth.jwt()->>'sub'))
          AND EXISTS (SELECT 1 FROM areas a WHERE a.id = topic_areas.area_id AND a.user_id = (SELECT auth.jwt()->>'sub'))
        )
    $pol$;
  END IF;
END $$;

COMMIT;
