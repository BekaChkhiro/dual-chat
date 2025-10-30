# Push Notifications Implementation - Project Plan
## DualChat PWA Push Notifications

---

## Executive Summary

**Objective**: Implement complete push notification system for DualChat PWA that alerts users when new messages arrive in their chats.

**Current Status**:
- ✅ Database schema exists (`web_push_subscriptions` table)
- ✅ Service worker with push handlers (`public/sw.js`)
- ✅ Client-side subscription helpers (`src/lib/push.ts`)
- ✅ Edge Function for sending notifications (`supabase/functions/send-web-push`)
- ⏳ **Missing**: Integration with messaging system, UI components, automatic triggers

**Estimated Timeline**: 3-5 days (with testing)

**Complexity**: Medium-High (iOS limitations add complexity)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Sends Message                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Messages Table (INSERT)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Database Trigger or Realtime Hook                    │
│    (Check chat_members, filter sender, check staff_only)    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          Call send-web-push Edge Function                    │
│       (For each recipient with subscriptions)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│             Browser Push API (Web Push)                      │
│         Delivers notification to user's device               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│     Service Worker (sw.js) shows notification                │
│    User clicks → opens chat in DualChat PWA                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical iOS PWA Limitations

### iOS Push Notification Requirements:
1. **iOS 16.4+** - Earlier versions don't support PWA push notifications
2. **Installed PWA** - App MUST be added to Home Screen (standalone mode)
3. **User Gesture** - Permission request MUST come from user interaction (button click)
4. **HTTPS Required** - Production must use HTTPS (localhost OK for dev)
5. **No Badge Support** - iOS doesn't support badge counts on PWA icons
6. **Focus Limitations** - Background notification handling is limited

### Android PWA Support:
- ✅ Full support for push notifications in Chrome/Edge
- ✅ Works in browser and installed PWA
- ✅ Better background behavior
- ✅ Badge support available

### Fallback Strategy:
For users without push support, we'll rely on:
- In-app realtime updates (already implemented)
- Browser tab title notifications (unread count)
- Audio/visual alerts when app is open

---

## Task Breakdown

### **Phase 1: Foundation & Configuration**
**Timeline**: 0.5 days | **Complexity**: Low

#### Task 1.1: Generate and Configure VAPID Keys
**Status**: ⏳ Pending
**Priority**: Critical
**Estimated Time**: 30 minutes

**Deliverables**:
- Generate VAPID key pair using `npx web-push generate-vapid-keys`
- Add public key to `.env` as `VITE_VAPID_PUBLIC_KEY`
- Set Supabase secrets: `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
- Set other required secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Document keys in secure location (1Password, etc.)

**Commands**:
```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Set Supabase secrets
supabase secrets set VAPID_PUBLIC_KEY="<public-key>"
supabase secrets set VAPID_PRIVATE_KEY="<private-key>"
supabase secrets set SUPABASE_URL="<your-project-url>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# Deploy Edge Function
supabase functions deploy send-web-push
```

**Acceptance Criteria**:
- ✅ VAPID keys generated and stored securely
- ✅ Environment variables set in `.env` and Supabase
- ✅ Edge Function deployed successfully
- ✅ Test Edge Function with curl returns 200 OK

---

#### Task 1.2: Verify PWA Configuration
**Status**: ⏳ Pending
**Priority**: High
**Estimated Time**: 1 hour

**Deliverables**:
- Verify `manifest.webmanifest` is properly configured
- Ensure service worker registration in main app
- Test PWA installation on iOS and Android devices
- Add proper icons for notifications (192x192, 512x512)

**Files to Check/Modify**:
- `/home/bekolozi/Desktop/duality-comms/public/manifest.webmanifest`
- `/home/bekolozi/Desktop/duality-comms/index.html` (service worker registration)
- `/home/bekolozi/Desktop/duality-comms/public/sw.js` (already exists)

**Acceptance Criteria**:
- ✅ PWA installs correctly on iOS 16.4+ (Add to Home Screen)
- ✅ PWA installs correctly on Android
- ✅ Service worker activates without errors
- ✅ Console shows no service worker errors

**Known Issues**:
- Current manifest uses `.ico` for icons - should add proper PNG icons
- Need to verify service worker registration happens before push subscription

---

### **Phase 2: UI Components & User Experience**
**Timeline**: 1 day | **Complexity**: Medium

#### Task 2.1: Create Notification Settings Component
**Status**: ⏳ Pending
**Priority**: High
**Estimated Time**: 3 hours

**Deliverables**:
- New component: `src/components/notifications/NotificationSettings.tsx`
- Toggle to enable/disable push notifications
- Display notification permission status
- Show subscription status (subscribed/not subscribed)
- Handle iOS-specific messaging (must install PWA first)

**Component Features**:
```typescript
// NotificationSettings.tsx
- Button: "Enable Notifications" / "Disable Notifications"
- Status indicator: Permission status (granted/denied/default)
- iOS detection and warning message
- Success/error toast messages
- Georgian language UI
```

**Integration Points**:
- Add to user profile settings page
- Add to chat header (quick toggle)
- Show on first login (optional onboarding)

**Acceptance Criteria**:
- ✅ User can enable notifications with one click
- ✅ iOS users see helpful message about installing PWA
- ✅ Permission status displays correctly
- ✅ Error states handled gracefully (denied, unsupported)
- ✅ Georgian translations for all UI text

---

#### Task 2.2: Add Notification Permission Prompt
**Status**: ⏳ Pending
**Priority**: Medium
**Estimated Time**: 2 hours

**Deliverables**:
- Smart permission request dialog
- Appears after user has used app (not immediately)
- Explains benefits of enabling notifications
- Dismissible with "Don't ask again" option

**Implementation Strategy**:
- Use localStorage to track if user dismissed prompt
- Show after 2-3 messages sent OR after 5 minutes of use
- Never show again if user clicked "Don't ask again"

**Georgian UI Text**:
```
Title: "შეტყობინებების ჩართვა"
Body: "მიიღეთ შეტყობინებები ახალ შეტყობინებებზე მაშინაც კი, როცა აპლიკაცია არ არის გახსნილი"
Buttons: "ჩართვა" / "არა, გმადლობთ"
```

**Acceptance Criteria**:
- ✅ Prompt appears at appropriate time (not annoying)
- ✅ User preferences persist across sessions
- ✅ Works on both iOS and Android
- ✅ Graceful handling of denied permissions

---

#### Task 2.3: Notification Icon and Badge in Header
**Status**: ⏳ Pending
**Priority**: Low
**Estimated Time**: 1 hour

**Deliverables**:
- Bell icon in app header showing notification status
- Visual indicator when notifications are enabled
- Quick access to notification settings

**Files to Modify**:
- App header component (likely in `src/components/` or `src/pages/Index.tsx`)

**Acceptance Criteria**:
- ✅ Icon shows enabled/disabled state
- ✅ Clicking icon opens notification settings
- ✅ Visual feedback is clear and intuitive

---

### **Phase 3: Message Notification Integration**
**Timeline**: 1.5 days | **Complexity**: High

#### Task 3.1: Create Database Function for Chat Member Lookup
**Status**: ⏳ Pending
**Priority**: Critical
**Estimated Time**: 2 hours

**Deliverables**:
- New database function: `get_chat_members_for_notification()`
- Returns list of user IDs who should receive notification
- Filters out message sender
- Respects staff-only message visibility rules
- Checks user notification preferences (if we add that table)

**SQL Migration** (`supabase/migrations/YYYYMMDDHHMMSS_notification_helpers.sql`):
```sql
-- Function to get users who should be notified for a message
CREATE OR REPLACE FUNCTION get_chat_members_for_notification(
  _chat_id UUID,
  _sender_id UUID,
  _is_staff_only BOOLEAN
)
RETURNS TABLE (user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT cm.user_id
  FROM chat_members cm
  WHERE cm.chat_id = _chat_id
    AND cm.user_id != _sender_id  -- Don't notify sender
    AND (
      NOT _is_staff_only  -- Regular message: notify all members
      OR has_role(cm.user_id, 'admin')  -- Staff message: only staff
      OR has_role(cm.user_id, 'team_member')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Acceptance Criteria**:
- ✅ Function returns correct user list for regular messages
- ✅ Function returns only staff for staff-only messages
- ✅ Sender is always excluded from notification list
- ✅ Function handles edge cases (no members, invalid chat_id)

---

#### Task 3.2: Create Database Trigger for New Messages
**Status**: ⏳ Pending
**Priority**: Critical
**Estimated Time**: 3 hours

**Deliverables**:
- Database trigger on `messages` INSERT
- Calls new Edge Function `notify-new-message`
- Includes all necessary context (chat info, sender, message preview)

**SQL Migration** (`supabase/migrations/YYYYMMDDHHMMSS_message_notification_trigger.sql`):
```sql
-- Function executed by trigger
CREATE OR REPLACE FUNCTION notify_message_via_http()
RETURNS TRIGGER AS $$
DECLARE
  _chat RECORD;
  _sender RECORD;
  _function_url TEXT;
BEGIN
  -- Get chat details
  SELECT client_name, company_name INTO _chat
  FROM chats WHERE id = NEW.chat_id;

  -- Get sender details
  SELECT full_name, email INTO _sender
  FROM profiles WHERE id = NEW.sender_id;

  -- Build Edge Function URL
  _function_url := current_setting('app.supabase_url') || '/functions/v1/notify-new-message';

  -- Make async HTTP request to Edge Function
  PERFORM http_post(
    _function_url,
    json_build_object(
      'message_id', NEW.id,
      'chat_id', NEW.chat_id,
      'sender_id', NEW.sender_id,
      'sender_name', COALESCE(_sender.full_name, _sender.email),
      'chat_name', COALESCE(_chat.client_name, _chat.company_name, 'Chat'),
      'content', NEW.content,
      'is_staff_only', NEW.is_staff_only
    )::text,
    'application/json'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_via_http();
```

**Note**: This requires `pg_http` extension. Alternative: Use Supabase Database Webhooks instead.

**Acceptance Criteria**:
- ✅ Trigger fires on every new message INSERT
- ✅ Edge Function receives correct payload
- ✅ No performance degradation on message sending
- ✅ Errors in notification don't block message creation

---

#### Task 3.3: Create Edge Function `notify-new-message`
**Status**: ⏳ Pending
**Priority**: Critical
**Estimated Time**: 4 hours

**Deliverables**:
- New Edge Function: `supabase/functions/notify-new-message/index.ts`
- Receives message metadata from trigger
- Looks up chat members who should be notified
- Calls `send-web-push` for each recipient
- Handles staff-only message filtering
- Includes proper error handling and logging

**File**: `supabase/functions/notify-new-message/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface MessagePayload {
  message_id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  chat_name: string;
  content: string;
  is_staff_only: boolean;
}

serve(async (req: Request) => {
  try {
    const payload: MessagePayload = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get members who should be notified
    const { data: members, error } = await supabase
      .rpc('get_chat_members_for_notification', {
        _chat_id: payload.chat_id,
        _sender_id: payload.sender_id,
        _is_staff_only: payload.is_staff_only
      });

    if (error) throw error;

    // Send notification to each member
    const notificationPromises = members.map(async (member: any) => {
      // Call send-web-push function
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-web-push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            user_id: member.user_id,
            payload: {
              title: payload.is_staff_only
                ? `${payload.chat_name} (Staff)`
                : payload.chat_name,
              body: `${payload.sender_name}: ${payload.content.substring(0, 100)}`,
              url: `/chat/${payload.chat_id}`,
              data: {
                chat_id: payload.chat_id,
                message_id: payload.message_id,
                is_staff_only: payload.is_staff_only
              }
            }
          })
        }
      );

      return { user_id: member.user_id, status: response.status };
    });

    const results = await Promise.allSettled(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, sent: results.length, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

**Acceptance Criteria**:
- ✅ Function receives message data correctly
- ✅ Only notifies appropriate chat members
- ✅ Staff-only messages only notify staff
- ✅ Notification text is properly formatted
- ✅ Deep link URL opens correct chat
- ✅ Errors logged but don't crash function

---

#### Task 3.4: Alternative Implementation - Supabase Database Webhooks
**Status**: ⏳ Pending (Alternative)
**Priority**: Medium
**Estimated Time**: 2 hours

**Rationale**:
Database triggers with HTTP calls require `pg_http` extension which may not be available. Supabase Database Webhooks are easier to configure.

**Implementation Steps**:
1. Remove database trigger from Task 3.2
2. Configure Database Webhook in Supabase Dashboard:
   - Table: `messages`
   - Events: `INSERT`
   - Webhook URL: `https://<project>.supabase.co/functions/v1/notify-new-message`
   - Method: POST
3. Modify `notify-new-message` Edge Function to handle webhook payload format

**Webhook Payload Format**:
```json
{
  "type": "INSERT",
  "table": "messages",
  "record": {
    "id": "...",
    "chat_id": "...",
    "sender_id": "...",
    "content": "...",
    "is_staff_only": false
  },
  "schema": "public",
  "old_record": null
}
```

**Acceptance Criteria**:
- ✅ Webhook fires on message INSERT
- ✅ Edge Function handles webhook payload
- ✅ Notifications sent successfully
- ✅ No duplicate notifications

---

### **Phase 4: Testing & Refinement**
**Timeline**: 1 day | **Complexity**: Medium

#### Task 4.1: Manual Testing on iOS
**Status**: ⏳ Pending
**Priority**: Critical
**Estimated Time**: 3 hours

**Test Cases**:
1. **Installation Test**:
   - Install PWA from Safari (Add to Home Screen)
   - Verify app opens in standalone mode
   - Check manifest and icons display correctly

2. **Permission Test**:
   - Request notification permission from settings
   - Verify permission dialog appears
   - Test "Allow" and "Don't Allow" flows

3. **Subscription Test**:
   - Enable notifications in app
   - Verify subscription saved to database
   - Check subscription keys are valid

4. **Notification Delivery Test**:
   - Send test message from another user
   - Verify notification appears on lock screen
   - Verify notification appears in notification center
   - Test notification when app is:
     - Closed
     - In background
     - In foreground (should not show duplicate)

5. **Click Handling Test**:
   - Click notification
   - Verify app opens to correct chat
   - Verify deep link works correctly

6. **Staff-Only Test**:
   - Send staff-only message
   - Verify only staff members get notification
   - Verify clients don't receive notification

**Known iOS Issues to Test**:
- iOS 16.3 or earlier: No push support
- Non-standalone mode: No push support
- Permission denied: Graceful fallback
- Service worker not registered: Error handling

**Documentation**:
- Document all iOS quirks and limitations
- Create troubleshooting guide for users

**Acceptance Criteria**:
- ✅ All test cases pass on iOS 16.4+
- ✅ Graceful degradation on older iOS
- ✅ Clear error messages for unsupported scenarios
- ✅ Documentation complete

---

#### Task 4.2: Manual Testing on Android
**Status**: ⏳ Pending
**Priority**: High
**Estimated Time**: 2 hours

**Test Cases**:
1. Test in Chrome browser (not installed)
2. Test installed PWA
3. Test notification delivery in all app states
4. Test deep linking
5. Test multiple devices for same user
6. Test notification icons and images

**Android-Specific Features to Test**:
- Badge count (if implemented)
- Notification actions (reply, mark as read)
- Notification grouping
- Persistent notifications

**Acceptance Criteria**:
- ✅ All test cases pass on Android 10+
- ✅ Works in browser and installed PWA
- ✅ No duplicate notifications
- ✅ Performance is acceptable

---

#### Task 4.3: Edge Case Testing
**Status**: ⏳ Pending
**Priority**: Medium
**Estimated Time**: 2 hours

**Edge Cases to Test**:
1. **Multiple Devices**: User logged in on phone and desktop
   - Expected: Notification on both devices
   - Test: Verify no duplicate processing

2. **Expired Subscriptions**: User's subscription expired
   - Expected: Clean up database, don't send
   - Test: Verify 410 Gone handled correctly

3. **Offline Sender**: Sender is offline when notification fails
   - Expected: Notification still queued/retried
   - Test: Verify delivery when sender back online

4. **No Subscriptions**: User has no push subscriptions
   - Expected: Fail gracefully, no errors
   - Test: Message still saves correctly

5. **Large Messages**: Message with 1000+ characters
   - Expected: Truncate preview to ~100 chars
   - Test: Notification doesn't overflow

6. **Message with Attachments**: Message has files attached
   - Expected: Show "📎 Attachment" in notification
   - Test: Proper icon/text display

7. **Multiple Messages Rapid Fire**: 10 messages in 5 seconds
   - Expected: Don't overwhelm user with notifications
   - Test: Consider notification throttling/grouping

8. **Organization Switching**: User switches organizations
   - Expected: Only get notifications for current org (optional)
   - Test: Verify filtering if implemented

**Acceptance Criteria**:
- ✅ All edge cases handled gracefully
- ✅ No crashes or data corruption
- ✅ User experience remains good
- ✅ Performance acceptable under load

---

#### Task 4.4: Performance Testing
**Status**: ⏳ Pending
**Priority**: Medium
**Estimated Time**: 1 hour

**Performance Metrics**:
1. **Message Send Latency**: Time from message send to notification delivery
   - Target: < 3 seconds (including network)

2. **Database Function Performance**: `get_chat_members_for_notification` execution time
   - Target: < 100ms for chats with 10 members

3. **Edge Function Performance**: `notify-new-message` execution time
   - Target: < 500ms per message

4. **Notification Delivery Rate**: Success rate of notifications
   - Target: > 95% delivery success

**Load Testing**:
- Test with chat of 50 members
- Test with 100 messages per minute
- Test with 10 concurrent chats receiving messages

**Optimization Opportunities**:
- Batch notification requests if possible
- Cache user role checks
- Optimize database queries with proper indexes

**Acceptance Criteria**:
- ✅ All performance targets met
- ✅ No significant degradation with scale
- ✅ Identified bottlenecks documented
- ✅ Optimization plan for future if needed

---

### **Phase 5: User Preferences & Polish**
**Timeline**: 1 day | **Complexity**: Low-Medium

#### Task 5.1: Create Notification Preferences Table (Optional)
**Status**: ⏳ Pending (Optional)
**Priority**: Low
**Estimated Time**: 2 hours

**Rationale**:
Allow users to control which notifications they receive (all messages, mentions only, none).

**SQL Migration** (`supabase/migrations/YYYYMMDDHHMMSS_notification_preferences.sql`):
```sql
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,

  -- Global preferences (when chat_id IS NULL)
  enabled BOOLEAN NOT NULL DEFAULT true,
  notify_on_all_messages BOOLEAN NOT NULL DEFAULT true,
  notify_on_mentions BOOLEAN NOT NULL DEFAULT true,
  notify_on_staff_messages BOOLEAN NOT NULL DEFAULT true,

  -- Per-chat overrides (when chat_id IS NOT NULL)
  muted_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, chat_id)
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_prefs"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**UI Components**:
- Global notification settings page
- Per-chat mute/unmute toggle
- "Do Not Disturb" hours (advanced)

**Acceptance Criteria**:
- ✅ Table created with proper RLS
- ✅ UI allows toggling preferences
- ✅ Notification function respects preferences
- ✅ Default values work correctly

---

#### Task 5.2: Add "Mute Chat" Feature
**Status**: ⏳ Pending (Optional)
**Priority**: Low
**Estimated Time**: 2 hours

**Deliverables**:
- "Mute" button in chat header
- Options: Mute for 1 hour, 8 hours, 24 hours, Until I unmute
- Visual indicator when chat is muted
- Modify notification function to check muted status

**Integration**:
- Update `get_chat_members_for_notification()` to filter muted users
- Add mute icon next to chat name when muted

**Acceptance Criteria**:
- ✅ User can mute individual chats
- ✅ Muted chats don't send notifications
- ✅ Mute status persists across sessions
- ✅ Auto-unmute works correctly

---

#### Task 5.3: Notification Sound Preferences
**Status**: ⏳ Pending (Optional)
**Priority**: Low
**Estimated Time**: 1 hour

**Deliverables**:
- Option to enable/disable notification sound
- Custom sound selection (3-4 sound options)
- Store preference in localStorage or database

**Implementation**:
- Modify service worker to play sound on push event
- Add audio files to `public/sounds/`

**Acceptance Criteria**:
- ✅ User can toggle sound on/off
- ✅ Sound plays on notification (when enabled)
- ✅ Preference persists across sessions

---

#### Task 5.4: In-App Notification Center (Future Enhancement)
**Status**: 📋 Backlog
**Priority**: Low
**Estimated Time**: 4-6 hours

**Description**:
Create an in-app notification center showing recent notifications, similar to Facebook/LinkedIn.

**Features**:
- Bell icon with unread count
- Dropdown showing last 10 notifications
- Mark as read functionality
- Deep links to messages/chats

**Not in Current Scope**:
This is a future enhancement and not part of the initial push notification implementation.

---

## Implementation Strategy

### Recommended Approach:

**Week 1**:
- **Day 1**: Phase 1 (Foundation & Configuration)
- **Day 2**: Phase 2 (UI Components)
- **Day 3**: Phase 3 Tasks 3.1-3.2 (Database functions & triggers)
- **Day 4**: Phase 3 Tasks 3.3-3.4 (Edge Function & Integration)
- **Day 5**: Phase 4 (Testing & Refinement)

**Optional Week 2** (Polish & Preferences):
- Phase 5 tasks as needed

### Alternative Approach (Faster MVP):

**3-Day Sprint**:
- **Day 1 AM**: VAPID keys, PWA verification, basic UI toggle
- **Day 1 PM**: Database function + Webhook configuration
- **Day 2 AM**: Edge Function implementation
- **Day 2 PM**: iOS testing and fixes
- **Day 3**: Android testing, edge cases, documentation

---

## Technical Decisions

### Decision 1: Database Trigger vs Supabase Webhooks

**Options**:
A. PostgreSQL Trigger with HTTP extension (`pg_http`)
B. Supabase Database Webhooks
C. Client-side Edge Function call after message send

**Recommendation**: **Option B - Supabase Database Webhooks**

**Rationale**:
- ✅ No extension dependencies
- ✅ Easy to configure in Supabase Dashboard
- ✅ Reliable and maintained by Supabase
- ✅ Good logging/monitoring
- ❌ Slight delay (~100-500ms) vs trigger
- ❌ Requires internet access (not offline-first)

**Implementation**: Use Database Webhooks as primary, keep trigger code in docs as alternative.

---

### Decision 2: Notification Content Privacy

**Options**:
A. Full message content in notification
B. Truncated message preview (100 chars)
C. Generic "New message" notification
D. User preference

**Recommendation**: **Option B with Georgian Privacy Enhancement**

**Rationale**:
- ✅ Balance between context and privacy
- ✅ Notification shows sender name + preview
- ✅ Staff-only messages marked as "(Staff)"
- ❌ May expose sensitive info on lock screen
- **Enhancement**: Add "Privacy Mode" preference to show only "New message from [name]"

**Implementation**:
```typescript
// Default mode
body: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`

// Privacy mode (if enabled in preferences)
body: `New message from ${senderName}`
```

---

### Decision 3: Multi-Device Handling

**Options**:
A. Send to all subscribed devices
B. Send to last active device only
C. User chooses preferred device

**Recommendation**: **Option A - All Devices**

**Rationale**:
- ✅ User gets notification wherever they are
- ✅ Simple implementation
- ✅ No need to track "last active device"
- ❌ May be annoying if user has 5 devices
- **Mitigation**: Service worker checks if tab is already open and focused (skip duplicate)

---

### Decision 4: Notification Grouping

**Options**:
A. Separate notification per message
B. Group by chat (replace previous notification)
C. Group by time window (5 messages = 1 notification)

**Recommendation**: **Option B for iOS, Option A for Android**

**Rationale**:
- iOS: Limited notification space, grouping reduces clutter
- Android: Better support for notification groups, can show list
- Implementation: Use notification `tag` parameter with chat_id

```javascript
// Service worker
self.registration.showNotification(title, {
  tag: `chat-${chatId}`,  // Replaces previous notification for same chat
  renotify: true,          // Alert user even if replacing
  // ...
});
```

---

## Risk Assessment

### High Risk Items:

1. **iOS PWA Installation Issues** ⚠️
   - **Risk**: Users don't know they need to "Add to Home Screen"
   - **Mitigation**: Clear in-app instructions, detection of standalone mode, helpful error messages
   - **Fallback**: In-app realtime notifications (already working)

2. **Notification Permission Denial** ⚠️
   - **Risk**: Users deny permission and can't re-enable easily
   - **Mitigation**: Explain benefits before asking, provide Settings deep link, graceful degradation
   - **Fallback**: In-app notifications only

3. **Edge Function Rate Limits** ⚠️
   - **Risk**: High message volume triggers Supabase rate limits
   - **Mitigation**: Implement request batching, monitor usage, upgrade plan if needed
   - **Fallback**: Queue notifications and retry

### Medium Risk Items:

4. **Service Worker Caching Bugs** ⚠️
   - **Risk**: Old service worker version causes push bugs
   - **Mitigation**: Proper versioning, force update mechanism, skip waiting on install
   - **Testing**: Clear service workers between test runs

5. **Subscription Expiration** ⚠️
   - **Risk**: Browser subscriptions expire, user doesn't resubscribe
   - **Mitigation**: Handle 410 Gone responses, clean up DB, periodic resubscription check
   - **Monitoring**: Track subscription expiration rates

6. **Database Performance** ⚠️
   - **Risk**: `get_chat_members_for_notification` slows down with large chats
   - **Mitigation**: Add database indexes, optimize query, consider caching
   - **Monitoring**: Track function execution time

### Low Risk Items:

7. **VAPID Key Management** ℹ️
   - **Risk**: Keys exposed or lost
   - **Mitigation**: Store securely, never commit to repo, document recovery process
   - **Impact**: Would require regenerating keys and resubscribing all users

8. **Notification Spam** ℹ️
   - **Risk**: Too many notifications annoy users
   - **Mitigation**: Implement mute/preferences, respect system settings, throttling
   - **User Control**: Easy to disable

---

## Testing Checklist

### Functional Testing:
- [ ] Push subscription works on iOS 16.4+ installed PWA
- [ ] Push subscription works on Android Chrome
- [ ] Notification appears on lock screen
- [ ] Notification appears in notification center
- [ ] Clicking notification opens correct chat
- [ ] Staff-only messages only notify staff
- [ ] Regular messages notify all chat members
- [ ] Sender doesn't receive their own notification
- [ ] Multiple devices for same user both receive notification
- [ ] Permission denied state handled gracefully
- [ ] Unsupported browser shows helpful message

### Performance Testing:
- [ ] Message send latency < 5 seconds
- [ ] Database function < 100ms
- [ ] Edge Function < 1 second
- [ ] Notification delivery success rate > 95%
- [ ] No UI blocking during subscription
- [ ] No message send delays

### Edge Case Testing:
- [ ] Expired subscriptions cleaned up
- [ ] No subscriptions fails gracefully
- [ ] Large messages truncated correctly
- [ ] Messages with attachments display properly
- [ ] Rapid-fire messages don't spam
- [ ] Offline handling works correctly

### Cross-Browser Testing:
- [ ] iOS Safari 16.4+
- [ ] iOS Safari 17+
- [ ] Android Chrome 90+
- [ ] Android Chrome latest
- [ ] Desktop Chrome
- [ ] Desktop Firefox (if supported)

### Security Testing:
- [ ] VAPID keys not exposed in client code
- [ ] RLS policies prevent unauthorized access
- [ ] Staff-only messages respect permissions
- [ ] No notification to users not in chat
- [ ] Service role key not exposed

---

## Documentation Deliverables

1. **User Guide** (Georgian):
   - How to enable notifications
   - iOS: How to install PWA
   - Android: How to enable in browser settings
   - Troubleshooting common issues
   - Privacy considerations

2. **Developer Documentation**:
   - Architecture overview
   - Database schema for notifications
   - Edge Function API documentation
   - Testing procedures
   - Deployment checklist

3. **Operations Guide**:
   - VAPID key rotation procedure
   - Monitoring notification delivery rates
   - Handling user complaints
   - Scaling considerations

4. **CLAUDE.md Updates**:
   - Add notification system section
   - Document new tables and functions
   - Update environment variables section
   - Add testing instructions

---

## Success Metrics

### Launch Criteria (MVP):
- [ ] 90% of iOS 16.4+ users can enable notifications
- [ ] 95% of Android users can enable notifications
- [ ] Notification delivery rate > 90%
- [ ] Average notification latency < 5 seconds
- [ ] Zero critical bugs in production
- [ ] Documentation complete

### Post-Launch Metrics:
- **Adoption Rate**: % of users who enable notifications
  - Target: 60% within first month

- **Delivery Success Rate**: % of sent notifications that are delivered
  - Target: >95%

- **Click-Through Rate**: % of notifications clicked
  - Target: >40%

- **Opt-Out Rate**: % of users who disable after enabling
  - Target: <10%

- **User Satisfaction**: Survey feedback on notification usefulness
  - Target: 4.0/5.0 stars

---

## Future Enhancements (Backlog)

1. **Rich Notifications** (Complexity: Medium)
   - Inline reply from notification (Android)
   - Message preview with sender avatar
   - Notification actions (Mark as read, Archive)

2. **Smart Notification Timing** (Complexity: High)
   - Learn user's active hours
   - Batch notifications during "Do Not Disturb"
   - Deliver when user is likely to engage

3. **Notification Channels** (Complexity: Low)
   - Separate channels for mentions, all messages, tasks
   - Per-channel sound and priority
   - Android notification categories

4. **Email Fallback** (Complexity: Medium)
   - If push fails, send email after 5 minutes
   - Digest emails for missed messages
   - Email preferences

5. **Desktop Notifications** (Complexity: Low)
   - Electron wrapper for native desktop notifications
   - macOS/Windows notification center integration
   - Better badge support

6. **Push Notification Analytics** (Complexity: Medium)
   - Track delivery rates per user/device
   - A/B test notification content
   - Identify and fix delivery issues

---

## Appendix

### A. VAPID Key Generation

```bash
# Install web-push globally (optional)
npm install -g web-push

# Generate keys
npx web-push generate-vapid-keys

# Output:
=======================================
Public Key:
BKxT... (87 characters)

Private Key:
q8VH... (43 characters)
=======================================
```

### B. Testing Push Notifications with curl

```bash
# Test send-web-push Edge Function
curl -X POST \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  https://<project-ref>.supabase.co/functions/v1/send-web-push \
  -d '{
    "user_id": "<user-uuid>",
    "payload": {
      "title": "Test Notification",
      "body": "This is a test from curl",
      "url": "/",
      "data": { "test": true }
    }
  }'
```

### C. Debugging Service Workers

```javascript
// In browser console:

// Check if service worker is registered
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
  console.log('Active:', reg?.active?.state);
});

// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});

// Check notification permission
console.log('Notification permission:', Notification.permission);

// Unregister all service workers (for testing)
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

### D. iOS PWA Detection

```typescript
// Check if running as installed PWA
export function isStandalonePWA(): boolean {
  // iOS
  if ('standalone' in window.navigator) {
    return (window.navigator as any).standalone === true;
  }

  // Android
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  return false;
}

// Check iOS version
export function getIOSVersion(): number | null {
  const ua = navigator.userAgent;
  const match = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// Check if iOS supports push
export function iosSupportsWebPush(): boolean {
  const version = getIOSVersion();
  return version !== null && version >= 16; // iOS 16.4+ required
}
```

### E. Notification Payload Examples

**Regular Message**:
```json
{
  "title": "TBC Bank",
  "body": "გიორგი: გამარჯობა, როგორ ხართ?",
  "data": {
    "url": "/chat/123e4567-e89b-12d3-a456-426614174000",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_id": "987fcdeb-51a2-43f7-b456-426614174000",
    "is_staff_only": false
  }
}
```

**Staff-Only Message**:
```json
{
  "title": "TBC Bank (Staff)",
  "body": "ნინო: შიდა შენიშვნა კლიენტზე",
  "data": {
    "url": "/chat/123e4567-e89b-12d3-a456-426614174000?mode=staff",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_id": "987fcdeb-51a2-43f7-b456-426614174000",
    "is_staff_only": true
  }
}
```

**Message with Attachment**:
```json
{
  "title": "TBC Bank",
  "body": "მარიამ: 📎 File: document.pdf",
  "data": {
    "url": "/chat/123e4567-e89b-12d3-a456-426614174000",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_id": "987fcdeb-51a2-43f7-b456-426614174000",
    "has_attachment": true
  }
}
```

---

## Glossary

- **VAPID**: Voluntary Application Server Identification - authentication protocol for web push
- **Service Worker**: Background script that handles push events
- **PWA**: Progressive Web App - installable web application
- **Standalone Mode**: PWA running as installed app (not in browser)
- **Push Subscription**: Browser-specific endpoint for sending notifications
- **Edge Function**: Supabase serverless function (Deno runtime)
- **RLS**: Row Level Security - PostgreSQL security feature
- **Webhook**: HTTP callback triggered by database events

---

## Contact & Support

For questions or issues during implementation:
- Refer to `/home/bekolozi/Desktop/duality-comms/PWA_NOTIFICATIONS.md`
- Check Supabase documentation: https://supabase.com/docs
- Web Push specification: https://www.w3.org/TR/push-api/
- iOS PWA guide: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Author**: Project Coordinator (Claude)
**Status**: Ready for Implementation
