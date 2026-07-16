-- Synthetic demo seed for local evaluation ONLY.
-- All names/emails are fake. Never put real personal data here.
-- Default user id is clearly synthetic; override with:
--   select set_config('app.seed_user_id', 'user_YOUR_CLERK_ID', false);
-- then re-run this file, or use: npx supabase db reset

do $$
declare
  v_user text := coalesce(nullif(current_setting('app.seed_user_id', true), ''), 'user_demo_ava_reyes_synthetic');
  v_area_work uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_area_life uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  v_goal uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_project uuid := 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  v_task1 uuid := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
  v_task2 uuid := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2';
  v_note uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
  v_resource uuid := 'ffffffff-ffff-4fff-8fff-fffffffffff1';
  v_topic uuid := '99999999-9999-4999-8999-999999999991';
  v_contact uuid := '88888888-8888-4888-8888-888888888881';
begin
  delete from tasks where user_id = v_user and id in (v_task1, v_task2);
  delete from notes where user_id = v_user and id = v_note;
  delete from resources where user_id = v_user and id = v_resource;
  delete from topics where user_id = v_user and id = v_topic;
  delete from contacts where user_id = v_user and id = v_contact;
  delete from projects where user_id = v_user and id = v_project;
  delete from goals where user_id = v_user and id = v_goal;
  delete from areas where user_id = v_user and id in (v_area_work, v_area_life);

  insert into areas (id, user_id, name, description, icon, color, type)
  values
    (v_area_work, v_user, 'Demo Work', 'Synthetic work domain for evaluators', 'briefcase', '#6366F1', 'professional'),
    (v_area_life, v_user, 'Demo Life', 'Synthetic personal domain', 'home', '#10B981', 'personal');

  insert into goals (id, user_id, name, description, term, priority)
  values (
    v_goal,
    v_user,
    'Evaluate SophionOS alpha',
    'Synthetic goal — safe to delete',
    'short',
    'medium'
  );

  insert into projects (id, user_id, name, description, status, priority)
  values (
    v_project,
    v_user,
    'Alpha walkthrough',
    'Synthetic project for screenshots and demos',
    'active',
    'medium'
  );

  insert into tasks (id, user_id, name, status, priority)
  values
    (v_task1, v_user, 'Import demo seed', 'completed', 'high'),
    (v_task2, v_user, 'Try personal data export', 'todo', 'medium');

  insert into notes (id, user_id, name, content, type, status)
  values (
    v_note,
    v_user,
    'Welcome note (synthetic)',
    'This content is fake demo data. Never store real secrets here.',
    'note',
    'active'
  );

  insert into resources (id, user_id, name, url, type, status)
  values (
    v_resource,
    v_user,
    'SophionOS docs (example)',
    'https://example.com/sophionos-docs',
    'website',
    'active'
  );

  insert into topics (id, user_id, name)
  values (v_topic, v_user, 'Demo topic');

  insert into contacts (id, user_id, name, email)
  values (
    v_contact,
    v_user,
    'Ava Reyes (Synthetic)',
    'ava.reyes.demo@example.com'
  );
end $$;
