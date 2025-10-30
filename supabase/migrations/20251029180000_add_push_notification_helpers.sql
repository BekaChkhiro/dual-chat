-- Migration: Add helper functions for push notifications
-- Created: 2025-10-29

-- Function to get all push subscriptions for members of a specific chat
-- This will be used by the Edge Function to send notifications to all chat members
CREATE OR REPLACE FUNCTION get_chat_member_subscriptions(p_chat_id UUID, p_exclude_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  subscription JSONB,
  endpoint TEXT,
  full_name TEXT,
  email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wps.user_id,
    jsonb_build_object(
      'endpoint', wps.endpoint,
      'keys', jsonb_build_object(
        'p256dh', wps.p256dh,
        'auth', wps.auth
      )
    ) as subscription,
    wps.endpoint,
    p.full_name,
    p.email
  FROM web_push_subscriptions wps
  INNER JOIN chat_members cm ON cm.user_id = wps.user_id
  INNER JOIN profiles p ON p.id = wps.user_id
  WHERE cm.chat_id = p_chat_id
    AND wps.user_id != COALESCE(p_exclude_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
  ORDER BY wps.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_chat_member_subscriptions(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_chat_member_subscriptions IS
'Returns all active push notification subscriptions for members of a chat, excluding the specified user (typically the message sender)';
