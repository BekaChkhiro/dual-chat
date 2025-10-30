# Push Notifications Setup Guide

This guide walks you through setting up Web Push Notifications for WorkChat.

## Overview

The push notification system consists of:
1. **VAPID Keys** - For secure push authentication
2. **Service Worker** (`public/sw.js`) - Handles push events in the browser
3. **Client Library** (`src/lib/push.ts`) - Manages subscriptions
4. **Database Function** - Retrieves chat member subscriptions
5. **Edge Function** (`notify-new-message`) - Sends notifications to chat members
6. **UI Components** - Permission request banner

## Prerequisites

- Supabase project with Edge Functions enabled
- Web Push library: `npm install web-push` (for VAPID key generation only)

## Setup Steps

### 1. Generate VAPID Keys

VAPID keys are already generated and added to `.env`:

```bash
npx web-push generate-vapid-keys
```

**Generated Keys:**
- Public Key: `BBBIzz5Wlv69qavZOBReWyv1HmDBpYhTHUnL90TJ6qEQGIcPB6PYbglk5Oe1Y2xF5dRNENktbAZFlTu9fNFXWxg`
- Private Key: `F0kCH9uTMwAHCxVtt-bERrCgklpc6XxCoDx8xocdNhI`

### 2. Configure Environment Variables

#### Local Environment (.env)

The public key is already added to `.env`:

```env
VITE_VAPID_PUBLIC_KEY="BBBIzz5Wlv69qavZOBReWyv1HmDBpYhTHUnL90TJ6qEQGIcPB6PYbglk5Oe1Y2xF5dRNENktbAZFlTu9fNFXWxg"
```

#### Supabase Secrets (Edge Functions)

You need to set the private key as a Supabase secret:

```bash
# Using Supabase CLI
npx supabase secrets set VAPID_PRIVATE_KEY="F0kCH9uTMwAHCxVtt-bERrCgklpc6XxCoDx8xocdNhI"
npx supabase secrets set VAPID_PUBLIC_KEY="BBBIzz5Wlv69qavZOBReWyv1HmDBpYhTHUnL90TJ6qEQGIcPB6PYbglk5Oe1Y2xF5dRNENktbAZFlTu9fNFXWxg"
```

Or via Supabase Dashboard:
1. Go to your project settings
2. Navigate to Edge Functions → Secrets
3. Add both `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY`

### 3. Apply Database Migration

Run the migration to add the helper function:

```bash
# If using Supabase CLI locally
npx supabase db push

# Or apply the migration file manually in Supabase SQL Editor:
# supabase/migrations/20251029180000_add_push_notification_helpers.sql
```

This creates the `get_chat_member_subscriptions()` function used by the Edge Function.

### 4. Deploy Edge Functions

Deploy both Edge Functions to Supabase:

```bash
# Deploy the notify-new-message function
npx supabase functions deploy notify-new-message

# Verify the existing send-web-push function is deployed
npx supabase functions deploy send-web-push
```

### 5. Restart Development Server

After updating `.env`, restart your development server:

```bash
npm run dev
```

## Testing Push Notifications

### Manual Testing Steps

1. **Enable Notifications**
   - Open the app in your browser
   - You should see a notification permission banner at the top
   - Click "ჩართვა" (Enable) button
   - Accept the browser permission prompt

2. **Verify Subscription**
   - Open browser DevTools → Console
   - Check for any errors in subscription process
   - Verify in Supabase Dashboard: `web_push_subscriptions` table should have a new row

3. **Test Message Notifications**
   - Open the app in two different browser tabs/windows (or use incognito mode for second user)
   - Log in as different users in each tab
   - Ensure both users are members of the same chat
   - Send a message from one user
   - The other user should receive a push notification

4. **Test with Multiple Devices**
   - Log in on desktop browser
   - Log in on mobile browser (PWA installed)
   - Send a message from one device
   - Verify notification appears on the other device

### Testing Staff-Only Messages

- Switch to Staff Mode (purple toggle)
- Send a staff-only message
- Only staff members should receive notifications
- Client users will NOT receive notifications for staff-only messages

### Debugging

Check the following if notifications aren't working:

1. **Browser Console Errors**
   ```javascript
   // Check service worker registration
   navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));

   // Check push subscription
   navigator.serviceWorker.ready.then(reg =>
     reg.pushManager.getSubscription().then(sub => console.log(sub))
   );
   ```

2. **Supabase Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions
   - Select `notify-new-message`
   - Check logs for errors

3. **Database Subscription Check**
   ```sql
   -- Check if subscriptions exist
   SELECT * FROM web_push_subscriptions;

   -- Test the helper function
   SELECT * FROM get_chat_member_subscriptions('your-chat-id-here', 'your-user-id-here');
   ```

4. **Network Tab**
   - Open DevTools → Network
   - Filter by "functions"
   - Send a message and check if `notify-new-message` is called
   - Check response status and payload

## Browser Compatibility

### Desktop
- ✅ Chrome/Edge 89+
- ✅ Firefox 44+
- ✅ Safari 16+ (macOS Ventura+)
- ❌ Safari older versions (no support)

### Mobile
- ✅ Chrome for Android
- ✅ Firefox for Android
- ✅ Safari for iOS 16.4+ (requires PWA installation)
- ⚠️ iOS: Must be added to Home Screen as PWA

## iOS/Safari Specific Setup

For iOS devices:

1. **Install as PWA**
   - Open WorkChat in Safari
   - Tap Share button
   - Select "Add to Home Screen"
   - Open from Home Screen icon

2. **Request Notification Permission**
   - Permission must be requested from a user gesture (button click)
   - The banner component already handles this correctly

3. **Testing on iOS**
   - Use Safari Technology Preview on macOS for easier debugging
   - iOS 16.4+ is required for push notifications
   - Must be in standalone mode (PWA installed)

## Architecture

### Flow Diagram

```
[User sends message]
       ↓
[Message inserted to database]
       ↓
[Client calls Edge Function: notify-new-message]
       ↓
[Edge Function queries: get_chat_member_subscriptions()]
       ↓
[For each chat member subscription]
       ↓
[Send push notification via web-push library]
       ↓
[Service Worker receives push event]
       ↓
[Display notification to user]
       ↓
[User clicks notification]
       ↓
[Open/focus app to specific chat]
```

### Key Components

1. **`src/lib/push.ts`**
   - `enablePushForCurrentUser()` - Subscribes user to push notifications
   - `disablePushForCurrentUser()` - Unsubscribes user

2. **`src/components/notifications/NotificationPermissionBanner.tsx`**
   - Shows banner prompting user to enable notifications
   - Handles permission request flow
   - Dismissible (stored in localStorage)

3. **`supabase/functions/notify-new-message/index.ts`**
   - Triggered when message is sent
   - Queries chat member subscriptions
   - Sends push notifications to all members except sender

4. **`public/sw.js`**
   - Service worker handling push events
   - Shows notifications with custom payload
   - Handles notification clicks (opens app)

## Notification Payload Structure

```typescript
{
  title: string;           // Chat name (client_name or company_name)
  body: string;            // "Sender Name: Message preview"
  icon: string;            // App icon URL
  badge: string;           // Badge icon URL
  tag: string;             // Unique tag (chat-${chatId})
  data: {
    url: string;           // Deep link to chat (?chat=${chatId})
    chat_id: string;       // Chat UUID
    message_id: string;    // Message UUID
    sender_id: string;     // Sender UUID
    is_staff_only: boolean; // Staff mode flag
  }
}
```

## Troubleshooting

### "Missing VAPID keys" Error

**Problem:** Edge Function returns error about missing VAPID keys.

**Solution:**
```bash
# Verify secrets are set in Supabase
npx supabase secrets list

# If missing, set them:
npx supabase secrets set VAPID_PRIVATE_KEY="your-private-key"
npx supabase secrets set VAPID_PUBLIC_KEY="your-public-key"
```

### Notifications Not Received

**Problem:** Messages sent but no notifications appear.

**Checklist:**
1. ✅ Notification permission granted in browser
2. ✅ User has active subscription in `web_push_subscriptions` table
3. ✅ Both users are members of the chat
4. ✅ Sender is not the same as receiver
5. ✅ Edge Function deployed and running
6. ✅ Browser supports push notifications

### iOS Notifications Not Working

**Problem:** iOS device not receiving notifications.

**Solutions:**
- ✅ Ensure iOS 16.4 or later
- ✅ App must be installed as PWA (Add to Home Screen)
- ✅ Open app from Home Screen icon, not Safari
- ✅ Permission granted from user gesture (button click)

### Subscription Expires

**Problem:** Notification subscription becomes invalid.

**Solution:** The system automatically cleans up expired subscriptions. When push fails with 404/410 status, the Edge Function removes the invalid subscription from the database.

## Production Considerations

1. **VAPID Key Security**
   - Never commit private key to git
   - Use Supabase secrets for Edge Functions
   - Keep `.env` file out of version control

2. **Rate Limiting**
   - Consider implementing rate limits for Edge Function calls
   - Push providers may have their own rate limits

3. **Notification Content**
   - Keep message preview short (truncated to 100 chars)
   - Include meaningful context in notification title
   - Test with various message lengths and special characters

4. **Performance**
   - Notification sending is async (doesn't block message send)
   - Failed notifications are logged but don't affect message delivery
   - Batch notifications when possible

5. **Privacy**
   - Staff-only messages only notify staff members
   - Notification content respects chat visibility rules
   - Subscriptions tied to user accounts

## Monitoring

### Key Metrics to Track

1. **Subscription Rate**
   ```sql
   -- Total active subscriptions
   SELECT COUNT(*) FROM web_push_subscriptions;

   -- Subscriptions per user
   SELECT user_id, COUNT(*) as sub_count
   FROM web_push_subscriptions
   GROUP BY user_id;
   ```

2. **Notification Delivery**
   - Check Edge Function logs for success/failure rates
   - Monitor for 404/410 errors (expired subscriptions)

3. **User Engagement**
   - Track notification click-through rate
   - Monitor re-subscription patterns

## Future Enhancements

Potential improvements:

1. **Notification Preferences**
   - Per-chat notification settings
   - Quiet hours / Do Not Disturb
   - Custom notification sounds

2. **Rich Notifications**
   - Action buttons (Reply, Mark as Read)
   - Inline reply functionality
   - Image/attachment previews

3. **Notification Grouping**
   - Group multiple messages from same chat
   - Summary notifications

4. **Analytics**
   - Track notification delivery rate
   - Click-through analytics
   - A/B testing for notification content

## Support

For issues or questions:
- Check Supabase Edge Function logs
- Review browser console for client-side errors
- Verify database migrations are applied
- Ensure all environment variables are set

---

**Last Updated:** 2025-10-29
**Version:** 1.0.0
