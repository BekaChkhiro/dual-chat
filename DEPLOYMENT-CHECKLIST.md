# Push Notifications Deployment Checklist

Use this checklist to deploy push notifications to your Supabase project.

## Pre-Deployment

- [x] VAPID keys generated
- [x] `.env` file updated with `VITE_VAPID_PUBLIC_KEY`
- [x] Code changes committed
- [ ] Database migration ready (`20251029180000_add_push_notification_helpers.sql`)
- [ ] Edge Functions ready (`notify-new-message/index.ts`)

## Deployment Steps

### 1. Set Supabase Secrets

```bash
# Set VAPID keys as secrets (required for Edge Functions)
npx supabase secrets set VAPID_PRIVATE_KEY="F0kCH9uTMwAHCxVtt-bERrCgklpc6XxCoDx8xocdNhI"
npx supabase secrets set VAPID_PUBLIC_KEY="BBBIzz5Wlv69qavZOBReWyv1HmDBpYhTHUnL90TJ6qEQGIcPB6PYbglk5Oe1Y2xF5dRNENktbAZFlTu9fNFXWxg"

# Verify secrets are set
npx supabase secrets list
```

### 2. Apply Database Migration

Choose one method:

**Option A: Using Supabase CLI**
```bash
npx supabase db push
```

**Option B: Via Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/migrations/20251029180000_add_push_notification_helpers.sql`
3. Paste and execute

**Option C: Direct SQL**
```sql
-- Run this in Supabase SQL Editor:
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
    wps.subscription,
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

GRANT EXECUTE ON FUNCTION get_chat_member_subscriptions(UUID, UUID) TO authenticated;
```

### 3. Deploy Edge Functions

```bash
# Deploy notify-new-message function
npx supabase functions deploy notify-new-message

# Verify deployment
npx supabase functions list
```

### 4. Update Production Environment Variables

In your hosting platform (Vercel, Netlify, etc.), add:

```
VITE_VAPID_PUBLIC_KEY=BBBIzz5Wlv69qavZOBReWyv1HmDBpYhTHUnL90TJ6qEQGIcPB6PYbglk5Oe1Y2xF5dRNENktbAZFlTu9fNFXWxg
```

### 5. Build and Deploy Frontend

```bash
# Build production bundle
npm run build

# Deploy to your hosting platform
# (e.g., vercel deploy, netlify deploy, etc.)
```

## Post-Deployment Verification

### 1. Check Edge Function
```bash
# Test the function with curl
curl -X POST https://[your-project-ref].supabase.co/functions/v1/notify-new-message \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "test-id",
    "chat_id": "test-chat-id",
    "sender_id": "test-sender-id",
    "message_text": "Test notification",
    "is_staff_only": false
  }'
```

### 2. Test in Production

1. Open production app in browser
2. Enable notifications when prompted
3. Check browser DevTools console for errors
4. Verify subscription in database:
   ```sql
   SELECT * FROM web_push_subscriptions WHERE user_id = '[your-user-id]';
   ```
5. Send a test message
6. Verify notification received

### 3. Monitor Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → notify-new-message
3. Check logs for successful invocations
4. Look for any errors

## Rollback Plan

If issues occur:

1. **Disable Notification Banner (Quick Fix)**
   - Comment out `<NotificationPermissionBanner />` in `src/pages/Index.tsx`
   - Redeploy frontend

2. **Disable Edge Function Call**
   - Comment out the Edge Function invocation in `src/components/chat/tabs/MessagesTab.tsx` (lines 182-201)
   - Messages will still send, just no notifications

3. **Rollback Database Migration**
   ```sql
   DROP FUNCTION IF EXISTS get_chat_member_subscriptions(UUID, UUID);
   ```

## Troubleshooting

### "Missing VAPID keys" Error
- Verify secrets with `npx supabase secrets list`
- Re-deploy Edge Function after setting secrets

### Notifications Not Received
- Check browser console for subscription errors
- Verify Edge Function logs for invocation
- Confirm user has granted notification permission
- Check `web_push_subscriptions` table for active subscriptions

### iOS Not Working
- Ensure iOS 16.4+
- App must be installed as PWA (Add to Home Screen)
- Open from Home Screen icon, not Safari browser

## Success Criteria

- [ ] VAPID secrets set in Supabase
- [ ] Database migration applied successfully
- [ ] Edge Function deployed and accessible
- [ ] Production environment variables set
- [ ] Frontend deployed with notification banner
- [ ] Test notifications received on multiple devices
- [ ] No errors in browser console
- [ ] No errors in Edge Function logs

## Additional Notes

**VAPID Keys for Reference:**
- Public: `BBBIzz5Wlv69qavZOBReWyv1HmDBpYhTHUnL90TJ6qEQGIcPB6PYbglk5Oe1Y2xF5dRNENktbAZFlTu9fNFXWxg`
- Private: `F0kCH9uTMwAHCxVtt-bERrCgklpc6XxCoDx8xocdNhI`

**Important:** Keep the private key secure. Never commit to version control.

---

**Deployed By:** ________________
**Date:** ________________
**Version:** 1.0.0
