-- Restrict adding chat members to admin only
-- Drop existing policy
DROP POLICY IF EXISTS "Team can add members" ON chat_members;

-- Create new policy: only admins can add members
CREATE POLICY "Only admins can add members"
  ON chat_members FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
