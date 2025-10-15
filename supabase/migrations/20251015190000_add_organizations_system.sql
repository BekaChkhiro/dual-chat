-- =====================================================
-- Migration: Add Organizations System
-- Description: Adds multi-organization support with profiles enhancement
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE - Add additional fields
-- =====================================================

-- Add phone, bio, and setup_completed columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Add constraint for bio length (max 500 characters)
ALTER TABLE profiles
  ADD CONSTRAINT bio_length_check CHECK (char_length(bio) <= 500);

-- Create index for setup_completed for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_setup_completed ON profiles(setup_completed);

-- =====================================================
-- 2. ORGANIZATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- =====================================================
-- 3. ORGANIZATION_MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- =====================================================
-- 4. UPDATE CHATS TABLE - Add organization_id
-- =====================================================

-- Add organization_id to chats (nullable for now, will be required later)
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_chats_organization_id ON chats(organization_id);

-- =====================================================
-- 5. STORAGE BUCKETS
-- =====================================================

-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create organization-logos bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true, -- Public so logos can be displayed
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. STORAGE POLICIES - Avatars
-- =====================================================

-- Users can view their own avatar
DROP POLICY IF EXISTS "Users can view own avatar" ON storage.objects;
CREATE POLICY "Users can view own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 7. STORAGE POLICIES - Organization Logos
-- =====================================================

-- Anyone can view organization logos (public bucket)
DROP POLICY IF EXISTS "Anyone can view organization logos" ON storage.objects;
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

-- Organization owners/admins can upload logos
DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
CREATE POLICY "Organization members can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id::text = (storage.foldername(name))[1]
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Organization owners/admins can update logos
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
CREATE POLICY "Organization members can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id::text = (storage.foldername(name))[1]
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Organization owners/admins can delete logos
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;
CREATE POLICY "Organization members can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id::text = (storage.foldername(name))[1]
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- =====================================================
-- 8. RLS POLICIES - Organizations
-- =====================================================

-- Members can view organizations they belong to
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
CREATE POLICY "Members can view their organizations"
ON organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

-- Any authenticated user can create an organization
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Owners and admins can update their organizations
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON organizations;
CREATE POLICY "Owners and admins can update organizations"
ON organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Only owners can delete organizations
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;
CREATE POLICY "Owners can delete organizations"
ON organizations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'owner'
  )
);

-- =====================================================
-- 9. RLS POLICIES - Organization Members
-- =====================================================

-- Members can view other members in their organizations
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
CREATE POLICY "Members can view organization members"
ON organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

-- System can insert members (handled by triggers and application logic)
DROP POLICY IF EXISTS "System can insert organization members" ON organization_members;
CREATE POLICY "System can insert organization members"
ON organization_members FOR INSERT
WITH CHECK (true);

-- Owners and admins can update member roles
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
CREATE POLICY "Owners and admins can update members"
ON organization_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Owners and admins can remove members
DROP POLICY IF EXISTS "Owners and admins can remove members" ON organization_members;
CREATE POLICY "Owners and admins can remove members"
ON organization_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
  -- Prevent removing the last owner
  AND NOT (
    organization_members.role = 'owner' AND
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = organization_members.organization_id AND role = 'owner') = 1
  )
);

-- =====================================================
-- 10. UPDATE CHATS RLS POLICIES
-- =====================================================

-- Members can view chats in their organizations
DROP POLICY IF EXISTS "Members can view their chats" ON chats;
CREATE POLICY "Members can view their chats"
ON chats FOR SELECT
USING (
  -- Must be a chat member
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chats.id
    AND chat_members.user_id = auth.uid()
  )
  AND (
    -- Either chat has no organization (legacy support)
    chats.organization_id IS NULL
    OR
    -- Or user is member of the organization
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chats.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
);

-- Update create chat policy to check organization membership
DROP POLICY IF EXISTS "Team members can create chats" ON chats;
CREATE POLICY "Team members can create chats"
ON chats FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member'))
  AND (
    -- Either no organization (for backward compatibility during migration)
    organization_id IS NULL
    OR
    -- Or user must be member of the organization
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chats.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
);

-- =====================================================
-- 11. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for organizations updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is organization owner
CREATE OR REPLACE FUNCTION is_organization_owner(_user_id UUID, _organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id
    AND organization_id = _organization_id
    AND role = 'owner'
  );
$$;

-- Function to check if user is organization admin or owner
CREATE OR REPLACE FUNCTION is_organization_admin(_user_id UUID, _organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id
    AND organization_id = _organization_id
    AND role IN ('owner', 'admin')
  );
$$;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_organization_role(_user_id UUID, _organization_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM organization_members
  WHERE user_id = _user_id
  AND organization_id = _organization_id
  LIMIT 1;
$$;

-- =====================================================
-- 13. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE organizations IS 'Organizations that users can belong to and create chats within';
COMMENT ON TABLE organization_members IS 'Maps users to organizations with their roles (owner, admin, member)';
COMMENT ON COLUMN profiles.setup_completed IS 'Indicates whether user has completed the initial setup wizard';
COMMENT ON COLUMN profiles.phone IS 'User phone number (optional)';
COMMENT ON COLUMN profiles.bio IS 'User biography/about me (max 500 characters)';
COMMENT ON COLUMN chats.organization_id IS 'Organization this chat belongs to (nullable for backward compatibility)';
