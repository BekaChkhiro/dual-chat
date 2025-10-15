-- Allow both admins and team_members to add chat members
DROP POLICY IF EXISTS "Only admins can add members" ON chat_members;

CREATE POLICY "Staff can add members"
  ON chat_members FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- Create function to auto-assign admin role when creating a chat
CREATE OR REPLACE FUNCTION auto_assign_chat_creator_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user already has admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = NEW.created_by AND role = 'admin'
  ) THEN
    -- Assign admin role to chat creator
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.created_by, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on chats table
DROP TRIGGER IF EXISTS on_chat_created_assign_admin ON chats;

CREATE TRIGGER on_chat_created_assign_admin
  AFTER INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_chat_creator_admin();
