-- ============================================
-- SETUP DATABASE FOR MEMBERS MANAGEMENT
-- ============================================

-- 1. First, update RLS policies for user_roles
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Create new flexible policies
CREATE POLICY "Users can view own roles, staff can view all"
  ON user_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

CREATE POLICY "Staff can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

CREATE POLICY "Staff can update roles"
  ON user_roles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

CREATE POLICY "Staff can remove roles"
  ON user_roles FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- 2. Update chat_members policy - staff (admins and team_members) can add members
DROP POLICY IF EXISTS "Team can add members" ON chat_members;
DROP POLICY IF EXISTS "Only admins can add members" ON chat_members;

CREATE POLICY "Staff can add members"
  ON chat_members FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- 3. Assign admin role to first user, team_member to second
-- Replace these UUIDs with your actual user IDs from profiles table
INSERT INTO user_roles (user_id, role) VALUES
  ('7d9d9212-0282-4764-897f-966c3b41f863', 'admin'),
  ('cd9e4b79-7da9-4c2b-88b0-ac2c1c4b229e', 'team_member')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Create trigger to auto-assign admin role when creating a chat
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

DROP TRIGGER IF EXISTS on_chat_created_assign_admin ON chats;

CREATE TRIGGER on_chat_created_assign_admin
  AFTER INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_chat_creator_admin();

-- 5. Create a test chat (optional - you can also create via UI)
-- Get the first user's ID for created_by
DO $$
DECLARE
  first_user_id UUID;
  chat_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO first_user_id FROM profiles LIMIT 1;

  -- Create chat if no chats exist
  IF NOT EXISTS (SELECT 1 FROM chats LIMIT 1) THEN
    INSERT INTO chats (id, client_name, company_name, created_by)
    VALUES (
      gen_random_uuid(),
      'Test Client',
      'Test Company',
      first_user_id
    )
    RETURNING id INTO chat_id;

    -- Add all users as chat members
    INSERT INTO chat_members (chat_id, user_id)
    SELECT chat_id, id FROM profiles
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    RAISE NOTICE 'Created test chat and added % members', (SELECT COUNT(*) FROM profiles);
  END IF;
END $$;

-- 6. Verify setup
SELECT 'User Roles:' as info, COUNT(*) as count FROM user_roles
UNION ALL
SELECT 'Profiles:', COUNT(*) FROM profiles
UNION ALL
SELECT 'Chats:', COUNT(*) FROM chats
UNION ALL
SELECT 'Chat Members:', COUNT(*) FROM chat_members;
