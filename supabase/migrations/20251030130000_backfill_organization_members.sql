-- Migration: Backfill organization members from existing chat members
-- Description: Add all existing chat members to their chat's organization if not already a member

-- This ensures that users who were added to chats before the auto-organization-membership feature
-- are properly added to the organization that owns their chat

DO $$
DECLARE
  _affected_rows INTEGER;
  _chat_member RECORD;
  _result JSONB;
BEGIN
  RAISE NOTICE 'Starting backfill of organization members from chat members...';

  -- For each chat member who is not already in the organization
  FOR _chat_member IN
    SELECT DISTINCT
      cm.user_id,
      c.organization_id,
      c.id as chat_id,
      p.email
    FROM chat_members cm
    JOIN chats c ON c.id = cm.chat_id
    JOIN profiles p ON p.id = cm.user_id
    WHERE c.organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM organization_members om
        WHERE om.user_id = cm.user_id
          AND om.organization_id = c.organization_id
      )
  LOOP
    BEGIN
      -- Use our new function to add the user to the organization
      SELECT add_user_to_chat_organization(_chat_member.user_id, _chat_member.chat_id)
      INTO _result;

      -- Log the result
      IF (_result->>'success')::boolean THEN
        RAISE NOTICE 'Added user % (%) to organization % via chat %: %',
          _chat_member.email,
          _chat_member.user_id,
          _chat_member.organization_id,
          _chat_member.chat_id,
          _result->>'message';
      ELSE
        RAISE WARNING 'Failed to add user % (%) to organization % via chat %: %',
          _chat_member.email,
          _chat_member.user_id,
          _chat_member.organization_id,
          _chat_member.chat_id,
          _result->>'message';
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error processing user % (%) for organization % via chat %: %',
          _chat_member.email,
          _chat_member.user_id,
          _chat_member.organization_id,
          _chat_member.chat_id,
          SQLERRM;
    END;
  END LOOP;

  -- Get count of affected rows
  SELECT COUNT(*)::INTEGER INTO _affected_rows
  FROM chat_members cm
  JOIN chats c ON c.id = cm.chat_id
  WHERE c.organization_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = cm.user_id
        AND om.organization_id = c.organization_id
    );

  RAISE NOTICE 'Backfill complete. Processed approximately % chat members.', _affected_rows;
END $$;

-- Add comment explaining this migration
COMMENT ON TABLE organization_members IS
'Maps users to organizations with their roles (owner, admin, member).
Users are automatically added when they join chats via add_user_to_chat_organization().
Backfill migration 20251030130000 ensures existing chat members are added to organizations.';
