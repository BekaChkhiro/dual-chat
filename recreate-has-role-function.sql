-- წავშალოთ ძველი has_role ფუნქცია
DROP FUNCTION IF EXISTS has_role(uuid, app_role);

-- ვქმნით ხელახლა has_role ფუნქციას როგორც SECURITY DEFINER
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- ეს არის მთავარი! SECURITY DEFINER თავიდან აცილებს RLS recursion-ს
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
END;
$$;

-- ვანიჭოთ execute უფლება ყველას
GRANT EXECUTE ON FUNCTION has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(uuid, app_role) TO anon;

-- შევამოწმოთ
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'has_role'
  AND n.nspname = 'public';
