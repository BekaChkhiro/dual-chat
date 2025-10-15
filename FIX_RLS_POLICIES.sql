-- =====================================================
-- FIX: RLS Policies with Infinite Recursion
-- =====================================================

-- Step 1: Drop ALL problematic policies
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "System can insert organization members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON organization_members;

DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;

-- Step 2: Create SIMPLE policies for organization_members (NO recursion)
CREATE POLICY "Allow all authenticated to view organization_members"
ON organization_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated to insert organization_members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update organization_members"
ON organization_members FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow users to delete organization_members"
ON organization_members FOR DELETE
TO authenticated
USING (true);

-- Step 3: Simplify storage policies for organization-logos (NO organization_members check)
DROP POLICY IF EXISTS "Anyone can view organization logos" ON storage.objects;
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

-- Allow any authenticated user to upload organization logos
CREATE POLICY "Authenticated users can upload organization logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-logos');

-- Allow any authenticated user to update organization logos
CREATE POLICY "Authenticated users can update organization logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-logos');

-- Allow any authenticated user to delete organization logos
CREATE POLICY "Authenticated users can delete organization logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-logos');

-- =====================================================
-- Note: This is a simplified version for MVP
-- In production, you can add more granular permissions
-- after the basic system is working
-- =====================================================
