import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(import.meta.dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx), l.slice(idx + 1)];
  })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Step 1: Check RLS policies on projects table
console.log('=== STEP 1: RLS policies on projects ===');
const { data: policies, error: policiesErr } = await admin
  .rpc('get_policies_for_table', { table_name: 'projects' });
if (policiesErr) {
  // Fallback: query pg_policies directly
  const { data: pgPolicies, error: pgErr } = await admin
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'projects');
  if (pgErr) {
    console.log(`pg_policies query error: ${pgErr.code} ${pgErr.message}`);
    // Try raw SQL via rpc
    const { data: raw, error: rawErr } = await admin.rpc('exec_sql', {
      sql: "SELECT schemaname, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'projects'"
    });
    if (rawErr) console.log(`exec_sql error: ${rawErr.message}`);
    else console.log('Policies:', JSON.stringify(raw, null, 2));
  } else {
    console.log('Policies:', JSON.stringify(pgPolicies, null, 2));
  }
} else {
  console.log('Policies:', JSON.stringify(policies, null, 2));
}

// Step 2: Test INSERT + hydration flow using admin client
// This mirrors what projectService.create() does
console.log('\n=== STEP 2: Full create flow with admin client ===');

const userId = 'test-user-id';
const name = 'Test Full Flow - DELETE ME';

// 2a: Check if project_progress_summary RPC exists
console.log('\n--- 2a: Check project_progress_summary RPC ---');
const { data: rpcResult, error: rpcError } = await admin.rpc('project_progress_summary', {
  p_project_ids: ['00000000-0000-0000-0000-000000000000']
});
if (rpcError) {
  console.log(`RPC error: ${rpcError.code} ${rpcError.message} ${rpcError.details || ''}`);
} else {
  console.log('RPC exists, result:', JSON.stringify(rpcResult));
}

// 2b: Raw insert (proven working)
console.log('\n--- 2b: Raw insert ---');
const { data: inserted, error: insertErr } = await admin
  .from('projects')
  .insert({
    user_id: userId,
    name,
    status: 'inbox',
    slug: `test-full-flow-${Date.now()}`
  })
  .select('id, user_id, name, status, slug')
  .single();
if (insertErr) {
  console.log(`INSERT failed: ${insertErr.code} ${insertErr.message}`);
  process.exit(1);
}
console.log('INSERT OK, id:', inserted.id);

// 2c: Test hydrate queries individually
console.log('\n--- 2c: Test hydrate queries ---');

// project_areas table
const { error: areasErr } = await admin.from('project_areas').select('id').eq('project_id', inserted.id);
console.log(`project_areas query: ${areasErr ? `FAIL ${areasErr.message}` : 'OK'}`);

// goal_projects table
const { error: goalsErr } = await admin.from('goal_projects').select('id').eq('project_id', inserted.id);
console.log(`goal_projects query: ${goalsErr ? `FAIL ${goalsErr.message}` : 'OK'}`);

// tasks (with progress query shape)
const { error: tasksErr } = await admin.from('tasks').select('id, is_completed, is_archived').eq('project_id', inserted.id);
console.log(`tasks query: ${tasksErr ? `FAIL ${tasksErr.message}` : 'OK'}`);

// notes (with progress query shape)
const { error: notesErr } = await admin.from('notes').select('id, is_archived').eq('project_id', inserted.id);
console.log(`notes query: ${notesErr ? `FAIL ${notesErr.message}` : 'OK'}`);

// note_projects junction
const { error: npErr } = await admin.from('note_projects').select('note_id').eq('project_id', inserted.id);
console.log(`note_projects query: ${npErr ? `FAIL ${npErr.message}` : 'OK'}`);

// resource_projects junction
const { error: rpErr } = await admin.from('resource_projects').select('resource_id').eq('project_id', inserted.id);
console.log(`resource_projects query: ${rpErr ? `FAIL ${rpErr.message}` : 'OK'}`);

// goals query (for rollup)
const { error: goalsQueryErr } = await admin.from('goals').select('id, is_completed, is_archived').limit(5);
console.log(`goals query: ${goalsQueryErr ? `FAIL ${goalsQueryErr.message}` : 'OK'}`);

// project_progress_summary RPC
const { error: summaryErr } = await admin.rpc('project_progress_summary', {
  p_project_ids: [inserted.id]
});
console.log(`project_progress_summary RPC: ${summaryErr ? `FAIL ${summaryErr.message}` : 'OK'}`);

// Cleanup
console.log('\n--- Cleanup ---');
const { error: delErr } = await admin.from('projects').delete().eq('id', inserted.id);
if (delErr) console.log(`Cleanup fail: ${delErr.message}`);
else console.log('Cleaned up');

process.exit(0);
