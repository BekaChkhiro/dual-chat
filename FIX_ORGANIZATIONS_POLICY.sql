-- =====================================================
-- FIX: Organizations INSERT Policy
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create simple policy - allow all authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure UPDATE policy is simple
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON organizations;
CREATE POLICY "Authenticated users can update their organizations"
ON organizations FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- DELETE policy - only creator can delete
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
CREATE POLICY "Creators can delete organizations"
ON organizations FOR DELETE
TO authenticated
USING (created_by = auth.uid());
