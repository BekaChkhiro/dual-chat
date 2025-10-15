-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- New RLS Policies for user_roles

-- SELECT: Users can view their own roles + staff can view all roles
CREATE POLICY "Users can view own roles, staff can view all"
  ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- INSERT: Only staff can assign roles
CREATE POLICY "Staff can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- UPDATE: Only staff can update roles (if needed in future)
CREATE POLICY "Staff can update roles"
  ON user_roles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- DELETE: Only staff can remove roles
CREATE POLICY "Staff can remove roles"
  ON user_roles FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );
