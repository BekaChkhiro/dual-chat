-- =====================================================
-- FIX CHAT CREATION
-- =====================================================

-- Step 1: Check if you have team_member role
-- Replace YOUR_EMAIL with your actual email
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'YOUR_EMAIL@example.com';

-- Step 2: If no roles, add team_member role
-- Replace YOUR_USER_ID with your actual user ID
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'team_member')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Also add admin role (optional, but useful)
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Fix chats RLS policies - make them SIMPLE
DROP POLICY IF EXISTS "Members can view their chats" ON chats;
DROP POLICY IF EXISTS "Team members can create chats" ON chats;
DROP POLICY IF EXISTS "Team members can update chats" ON chats;

-- Simple policies for chats
CREATE POLICY "view_chats"
ON chats FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "insert_chats"
ON chats FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_chats"
ON chats FOR UPDATE
TO authenticated
USING (true);

-- Step 5: Fix chat_members policies
DROP POLICY IF EXISTS "Members can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Team can add members" ON chat_members;
DROP POLICY IF EXISTS "Team can remove members" ON chat_members;

CREATE POLICY "view_chat_members"
ON chat_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "insert_chat_members"
ON chat_members FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "delete_chat_members"
ON chat_members FOR DELETE
TO authenticated
USING (true);

-- Step 6: Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('chats', 'chat_members')
ORDER BY tablename, policyname;
