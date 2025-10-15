-- 1. შევამოწმოთ user_roles ცხრილის ყველა RLS პოლისი
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  qual as "USING (condition)",
  with_check as "WITH CHECK (condition)"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_roles'
ORDER BY policyname;

-- 2. შევამოწმოთ არის თუ არა RLS ჩართული
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_roles';

-- 3. შევამოწმოთ რა მონაცემებია user_roles-ში
SELECT
  ur.user_id,
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
ORDER BY p.email, ur.role;
