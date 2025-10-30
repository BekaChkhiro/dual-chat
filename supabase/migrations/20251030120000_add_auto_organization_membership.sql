-- Migration: Auto-add chat members to organization
-- Description: When a user is added to a chat, automatically add them to the chat's organization if not already a member

-- Function to add user to chat's organization
CREATE OR REPLACE FUNCTION add_user_to_chat_organization(_user_id UUID, _chat_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _organization_id UUID;
  _existing_member BOOLEAN;
  _result JSONB;
BEGIN
  -- Get the organization_id for this chat
  SELECT organization_id INTO _organization_id
  FROM chats
  WHERE id = _chat_id;

  -- If chat has no organization (legacy chats), return success without doing anything
  IF _organization_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Chat has no organization',
      'action', 'none'
    );
  END IF;

  -- Check if user is already a member of this organization
  SELECT EXISTS(
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id AND organization_id = _organization_id
  ) INTO _existing_member;

  -- If already a member, return success
  IF _existing_member THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already member of organization',
      'action', 'none',
      'organization_id', _organization_id
    );
  END IF;

  -- Add user to organization with 'member' role
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (_user_id, _organization_id, 'member');

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User added to organization',
    'action', 'added',
    'organization_id', _organization_id,
    'role', 'member'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error but don't fail the transaction
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'action', 'error'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_chat_organization(UUID, UUID) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION add_user_to_chat_organization IS
'Automatically adds a user to the organization that owns a chat.
Used when adding members to chats to ensure they have organization access.
Idempotent - safe to call multiple times.';
