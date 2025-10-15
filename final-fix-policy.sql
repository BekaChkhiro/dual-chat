-- წავშალოთ ყველა არსებული policy user_roles-დან
DROP POLICY IF EXISTS "Users can view own roles, staff can view all" ON user_roles;
DROP POLICY IF EXISTS "Staff can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Staff can update roles" ON user_roles;
DROP POLICY IF EXISTS "Staff can remove roles" ON user_roles;

-- ვქმნით ახალ policies-ს has_role ფუნქციით (რომელიც SECURITY DEFINER არის)

-- SELECT: ყველა მომხმარებელი ხედავს საკუთარ როლებს, staff ხედავს ყველას
CREATE POLICY "Users can view own roles, staff can view all"
  ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- INSERT: მხოლოდ staff-ს შეუძლია როლების დამატება
CREATE POLICY "Staff can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- UPDATE: მხოლოდ staff-ს შეუძლია როლების განახლება
CREATE POLICY "Staff can update roles"
  ON user_roles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- DELETE: მხოლოდ staff-ს შეუძლია როლების წაშლა
CREATE POLICY "Staff can remove roles"
  ON user_roles FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- შევამოწმოთ რომ policies შეიქმნა
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;
