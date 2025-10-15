-- =====================================================
-- CHECK CURRENT POLICIES AND FIX EVERYTHING
-- =====================================================

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, policyname;

-- =====================================================
-- Now DROP ALL policies and recreate them SIMPLE
-- =====================================================

-- ORGANIZATIONS TABLE
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Creators can delete organizations" ON organizations;

-- Create SIMPLE policies for organizations
CREATE POLICY "view_organizations"
ON organizations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "insert_organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_organizations"
ON organizations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "delete_organizations"
ON organizations FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Verify policies were created
-- =====================================================
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;
