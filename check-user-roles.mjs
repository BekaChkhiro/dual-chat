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

async function checkUserRoles() {
  console.log('Checking user roles and policies...\n');

  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return;
  }

  console.log('=== All Users ===');
  profiles.forEach((profile, idx) => {
    console.log(`${idx + 1}. ${profile.full_name || 'No name'} (${profile.email})`);
    console.log(`   ID: ${profile.id}`);
  });

  // Get all user roles
  console.log('\n=== All User Roles ===');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    console.log('This might be an RLS policy issue!');
  } else if (roles && roles.length > 0) {
    const rolesByUser = {};
    roles.forEach(r => {
      if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
      rolesByUser[r.user_id].push(r.role);
    });

    Object.keys(rolesByUser).forEach(userId => {
      const profile = profiles.find(p => p.id === userId);
      const userInfo = profile ? `${profile.full_name || 'No name'} (${profile.email})` : userId;
      console.log(`${userInfo}: ${rolesByUser[userId].join(', ')}`);
    });
  } else {
    console.log('No roles found in database!');
  }

  // Check current auth user
  console.log('\n=== Current Auth User ===');
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.log('No authenticated user - you need to sign in first');
  } else if (user) {
    console.log(`Logged in as: ${user.email}`);
    console.log(`User ID: ${user.id}`);

    // Try to get this user's roles
    const { data: myRoles, error: myRolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (myRolesError) {
      console.log('Error fetching your roles:', myRolesError);
    } else if (myRoles && myRoles.length > 0) {
      console.log(`Your roles: ${myRoles.map(r => r.role).join(', ')}`);
    } else {
      console.log('⚠️  You have NO ROLES assigned!');
      console.log('This is why you see "Only staff has access to members list"');
    }
  } else {
    console.log('No authenticated user');
  }
}

checkUserRoles();
