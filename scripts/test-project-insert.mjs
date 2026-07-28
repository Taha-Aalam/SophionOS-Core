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

console.log('URL:', supabaseUrl);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Try inserting a project with status 'inbox'
const { data, error } = await admin
  .from('projects')
  .insert({
    user_id: 'test-user-id',
    name: 'Test Project - DELETE ME',
    status: 'inbox'
  })
  .select();

if (error) {
  console.log('\nFAILED');
  console.log('code:', error.code);
  console.log('message:', error.message);
  console.log('details:', error.details);
  console.log('hint:', error.hint);
} else {
  console.log('\nSUCCESS');
  console.log(JSON.stringify(data, null, 2));
  const { error: delErr } = await admin.from('projects').delete().eq('id', data[0].id);
  if (delErr) console.log('Cleanup fail:', delErr.message);
  else console.log('Cleaned up');
}

process.exit(0);
