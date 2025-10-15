-- წავშალოთ პოლისი რომელიც რეკურსიას ქმნის
DROP POLICY IF EXISTS "Users can view own roles, staff can view all" ON user_roles;

-- ვქმნით პოლისს რომელიც has_role ფუნქციას იყენებს
-- has_role არის SECURITY DEFINER და არ იწვევს recursion-ს
CREATE POLICY "Users can view own roles, staff can view all"
  ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- შევამოწმოთ has_role ფუნქცია არის SECURITY DEFINER
SELECT
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'has_role'
  AND n.nspname = 'public';

-- თუ is_security_definer არის false, მაშინ ვქმნით has_role ფუნქციას სწორად
