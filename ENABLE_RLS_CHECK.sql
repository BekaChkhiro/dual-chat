-- =====================================================
-- CHECK AND ENABLE RLS
-- =====================================================

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'organization_members');

-- Disable and Re-enable RLS to refresh
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Verify again
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'organization_members');

-- Also check policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;
