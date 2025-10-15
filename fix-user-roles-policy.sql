-- დავრწმუნდეთ რომ არსებობს SELECT პოლისი user_roles-ზე
-- რომელიც საშუალებას აძლევს მომხმარებლებს წაიკითხონ საკუთარი როლები

-- წავშალოთ ძველი პოლისი თუ არსებობს
DROP POLICY IF EXISTS "Users can view own roles, staff can view all" ON user_roles;

-- ვქმნით ახალ პოლისს რომელიც საშუალებას აძლევს:
-- 1. ყველა მომხმარებელს ნახოს საკუთარი როლები
-- 2. admin/team_member-ებს ნახონ ყველას როლები
CREATE POLICY "Users can view own roles, staff can view all"
  ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'team_member')
    )
  );

-- შევამოწმოთ შედეგი
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
  AND cmd = 'SELECT';
