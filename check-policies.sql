-- შევამოწმოთ user_roles ცხრილის პოლისები
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- შევამოწმოთ has_role ფუნქცია არსებობს თუ არა
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'has_role'
  AND n.nspname = 'public';

-- შევამოწმოთ რა როლებია ბაზაში
SELECT
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
ORDER BY p.email, ur.role;
