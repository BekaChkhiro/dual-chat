import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
const envFile = readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    let value = valueParts.join('=').trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key.trim()] = value;
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function applyRoles() {
  console.log('Assigning roles to users...\n');

  // First user - beka - as admin
  const { data: adminRole, error: adminError } = await supabase
    .from('user_roles')
    .insert({
      user_id: '7d9d9212-0282-4764-897f-966c3b41f863',
      role: 'admin'
    })
    .select();

  if (adminError) {
    if (adminError.code === '23505') {
      console.log('✓ Admin role already exists for beka');
    } else {
      console.error('✗ Error assigning admin role to beka:', adminError);
    }
  } else {
    console.log('✓ Assigned admin role to beka (bekachkhirodze1@gmail.com)');
  }

  // Second user - webinfinity - as team_member
  const { data: teamRole, error: teamError } = await supabase
    .from('user_roles')
    .insert({
      user_id: 'cd9e4b79-7da9-4c2b-88b0-ac2c1c4b229e',
      role: 'team_member'
    })
    .select();

  if (teamError) {
    if (teamError.code === '23505') {
      console.log('✓ Team member role already exists for webinfinity');
    } else {
      console.error('✗ Error assigning team_member role to webinfinity:', teamError);
    }
  } else {
    console.log('✓ Assigned team_member role to webinfinity (webinfinity11@gmail.com)');
  }

  console.log('\n=== Verifying roles ===');

  // Verify roles were added
  const { data: allRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
  } else if (allRoles && allRoles.length > 0) {
    console.log('Current roles in database:');
    allRoles.forEach(r => {
      const userName = r.user_id === '7d9d9212-0282-4764-897f-966c3b41f863' ? 'beka' : 'webinfinity';
      console.log(`  - ${userName}: ${r.role}`);
    });
  } else {
    console.log('⚠️  Still no roles in database - there might be an RLS policy issue');
  }

  console.log('\n✓ Done! Try refreshing your app now.');
}

applyRoles();
