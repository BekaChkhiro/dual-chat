-- Create security definer function to check chat membership (prevents recursion)
CREATE OR REPLACE FUNCTION is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_id = _chat_id AND user_id = _user_id
  );
$$;

-- Drop and recreate the problematic policy to fix infinite recursion
DROP POLICY IF EXISTS "Members can view chat members" ON chat_members;

CREATE POLICY "Members can view chat members"
  ON chat_members FOR SELECT
  USING (
    is_chat_member(chat_id, auth.uid()) OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'team_member')
  );

-- Update the handle_new_user function to assign default role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Assign default team_member role
  INSERT INTO user_roles (user_id, role)
  VALUES (new.id, 'team_member');
  
  RETURN new;
END;
$$;