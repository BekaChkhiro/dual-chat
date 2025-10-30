-- Test script to verify RLS policies are working correctly
-- Run this in Supabase SQL Editor to check if policies are correct

-- 1. Check if RLS is enabled on chats table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'chats';
-- Expected: rowsecurity = true

-- 2. Check all policies on chats table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'chats';

-- 3. Check if add_user_to_chat_organization function exists
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'add_user_to_chat_organization';
-- Expected: should return 1 row with security_type = 'DEFINER'

-- 4. Test the function (replace UUIDs with actual values from your database)
-- SELECT add_user_to_chat_organization(
--   '<user-uuid>'::uuid,
--   '<chat-uuid>'::uuid
-- );
