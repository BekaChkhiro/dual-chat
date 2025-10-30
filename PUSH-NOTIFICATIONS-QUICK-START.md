# Push Notifications - Quick Start Guide
## WorkChat PWA - სწრაფი დაწყება

---

## Step 1: Generate VAPID Keys (5 წუთი)

```bash
# Terminal-ში გაუშვი:
npx web-push generate-vapid-keys
```

**Output-ი ასე გამოიყურება**:
```
=======================================
Public Key:
BKxT7n... (87 characters)

Private Key:
q8VH3m... (43 characters)
=======================================
```

**დაკოპირე ორივე Key!**

---

## Step 2: Configure Environment Variables (5 წუთი)

### A. Local Development (.env file):

ფაილში `/home/bekolozi/Desktop/duality-comms/.env` დაამატე:
```bash
VITE_VAPID_PUBLIC_KEY="<შენი-public-key>"
```

### B. Supabase Secrets:

```bash
# Terminal-ში:
supabase secrets set VAPID_PUBLIC_KEY="<შენი-public-key>"
supabase secrets set VAPID_PRIVATE_KEY="<შენი-private-key>"
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

**სად ვიპოვო Service Role Key?**
- Supabase Dashboard → Project Settings → API → service_role key (secret)

---

## Step 3: Deploy Edge Function (2 წუთი)

```bash
# უკვე არსებული function:
supabase functions deploy send-web-push
```

**Test ამ ფუნქციის**:
```bash
curl -X POST \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  https://<project-ref>.supabase.co/functions/v1/send-web-push \
  -d '{
    "user_id": "<test-user-id>",
    "payload": {
      "title": "Test",
      "body": "This is a test",
      "url": "/"
    }
  }'
```

**Expected Response**: `{"sent": 0, "results": []}` (თუ user-ს არ აქვს subscription)

---

## Step 4: Create Database Function (10 წუთი)

**ახალი Migration**: `supabase/migrations/20251029120000_notification_helpers.sql`

```sql
-- Function to get users who should be notified
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

**Apply Migration**:
```bash
supabase db push
```

---

## Step 5: Create notify-new-message Edge Function (30 წუთი)

**ახალი ფაილი**: `supabase/functions/notify-new-message/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: MessagePayload = await req.json();

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
    const results = await Promise.allSettled(
      (members || []).map(async (member: any) => {
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
                body: `${payload.sender_name}: ${payload.content.substring(0, 100)}${payload.content.length > 100 ? '...' : ''}`,
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
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.length,
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
```

**Deploy**:
```bash
supabase functions deploy notify-new-message
```

---

## Step 6: Configure Database Webhook (5 წუთი)

### Option A: Supabase Dashboard (Recommended)

1. Supabase Dashboard → Database → Webhooks
2. Click "Create a new hook"
3. კონფიგურაცია:
   - **Name**: `notify-new-message`
   - **Table**: `messages`
   - **Events**: `INSERT` ✓
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://<project-ref>.supabase.co/functions/v1/notify-new-message`
   - **HTTP Headers**:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <service-role-key>`
4. Click "Create webhook"

### Option B: Database Trigger (Advanced)

თუ Webhook-ი არ მუშაობს, შეგიძლია Database Trigger გამოიყენო. სრული კოდი იხილეთ:
`/home/bekolozi/Desktop/duality-comms/PWA-PUSH-NOTIFICATIONS-PROJECT-PLAN.md` - Task 3.2

---

## Step 7: Create UI Component (1 საათი)

**ახალი ფაილი**: `src/components/notifications/NotificationSettings.tsx`

```typescript
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { enablePushForCurrentUser, disablePushForCurrentUser } from "@/lib/push";
import { toast } from "sonner";

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check if subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setEnabled(!!sub);
        });
      });
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await enablePushForCurrentUser();

      if (result.ok) {
        setEnabled(true);
        setPermission(Notification.permission);
        toast.success("შეტყობინებები წარმატებით ჩაირთო");
      } else {
        if (result.reason === 'denied') {
          toast.error("შეტყობინებების ნებართვა უარყოფილია");
        } else if (result.reason === 'unsupported') {
          toast.error("თქვენი ბრაუზერი არ უჭერს მხარს შეტყობინებებს");
        } else if (result.reason === 'missing_vapid') {
          toast.error("VAPID key არ არის კონფიგურირებული");
        }
      }
    } catch (error) {
      toast.error("შეცდომა შეტყობინებების ჩართვისას");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disablePushForCurrentUser();
      setEnabled(false);
      toast.success("შეტყობინებები გამორთულია");
    } catch (error) {
      toast.error("შეცდომა შეტყობინებების გამორთვისას");
    } finally {
      setLoading(false);
    }
  };

  // Check if iOS and not installed
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone;

  if (isIOS && !isStandalone) {
    return (
      <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4">
        <div className="flex items-start">
          <Bell className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">iOS - დააინსტალირეთ აპლიკაცია</h3>
            <p className="text-sm text-yellow-700 mt-1">
              iOS-ზე შეტყობინებების მისაღებად საჭიროა აპლიკაციის დაინსტალირება:
            </p>
            <ol className="text-sm text-yellow-700 mt-2 list-decimal list-inside">
              <li>Safari-ში გახსენით ეს გვერდი</li>
              <li>დააჭირეთ Share ღილაკს (📤)</li>
              <li>აირჩიეთ "Add to Home Screen"</li>
              <li>გახსენით აპლიკაცია Home Screen-იდან</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {enabled ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <h3 className="font-semibold">შეტყობინებები</h3>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "ჩართულია - მიიღებთ შეტყობინებებს ახალ მესიჯებზე"
                : "გამორთულია - არ მიიღებთ შეტყობინებებს"}
            </p>
          </div>
        </div>

        <Button
          onClick={enabled ? handleDisable : handleEnable}
          disabled={loading || permission === 'denied'}
          variant={enabled ? "outline" : "default"}
        >
          {loading ? "..." : enabled ? "გამორთვა" : "ჩართვა"}
        </Button>
      </div>

      {permission === 'denied' && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-3">
          <p className="text-sm text-red-700">
            შეტყობინებების ნებართვა უარყოფილია.
            გთხოვთ ჩართოთ ბრაუზერის პარამეტრებიდან.
          </p>
        </div>
      )}
    </div>
  );
}
```

**გამოყენება**:
```typescript
// In your settings page or user profile:
import { NotificationSettings } from "@/components/notifications/NotificationSettings";

// Then in component:
<NotificationSettings />
```

---

## Step 8: Test Everything (30 წუთი)

### A. Test Subscription:

1. App-ში გახსენი NotificationSettings კომპონენტი
2. დააჭირე "ჩართვა"
3. მიიღე ბრაუზერის permission prompt
4. დააჭირე "Allow"
5. შეამოწმე database:

```sql
-- Supabase SQL Editor:
SELECT * FROM web_push_subscriptions
WHERE user_id = '<your-user-id>';
```

### B. Test Notification Delivery:

**Terminal-ში გაუშვი test**:
```bash
curl -X POST \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  https://<project-ref>.supabase.co/functions/v1/send-web-push \
  -d '{
    "user_id": "<your-user-id>",
    "payload": {
      "title": "WorkChat ტესტი",
      "body": "ეს არის სატესტო შეტყობინება",
      "url": "/",
      "data": {}
    }
  }'
```

**Expected**: უნდა მოგივიდეს notification!

### C. Test Real Message:

1. ორი user-ით login გააკეთე (ან ორი device)
2. User 1: Enable notifications
3. User 2: გაუგზავნე message chat-ში
4. User 1: უნდა მოვიდეს notification

---

## iOS-ზე ტესტირება

### Prerequisites:
- **iPhone/iPad**: iOS 16.4 ან უფრო ახალი
- **Safari**: უახლესი ვერსია
- **HTTPS**: Production URL (localhost არ მუშაობს iOS-ზე)

### Steps:

1. **Install PWA**:
   - Safari-ში გახსენი app URL
   - დააჭირე Share (📤)
   - აირჩიე "Add to Home Screen"
   - დააჭირე "Add"

2. **Open Installed App**:
   - Home Screen-ზე ნახე app icon
   - გახსენი app (standalone mode-ში უნდა გაიხსნას)

3. **Enable Notifications**:
   - Settings-ში გადადი
   - დააჭირე "ჩართვა" notifications-ზე
   - iOS permission dialog გამოჩნდება
   - დააჭირე "Allow"

4. **Test**:
   - Desktop-ზე/სხვა device-ზე გაუგზავნე message
   - iPhone-ზე უნდა მოვიდეს notification (lock screen-ზეც)

### Common iOS Issues:

**Problem**: Permission prompt არ ჩნდება
- **Fix**: დარწმუნდი რომ standalone mode-ში იყოს (Home Screen-იდან გაშვებული)

**Problem**: Notification არ მოდის
- **Fix**:
  1. Settings → Notifications → WorkChat → Allow Notifications ✓
  2. დარწმუნდი რომ Focus Mode არ არის ჩართული

**Problem**: "Add to Home Screen" არ ჩანს
- **Fix**: Safari-ში უნდა გახსნა (არა Chrome-ში)

---

## Android-ზე ტესტირება

### Steps:

1. **Chrome-ში გახსენი App**
2. **Enable Notifications** (Settings-დან ან prompt-იდან)
3. **Test**:
   - სხვა device-ზე გაუგზავნე message
   - Android-ზე უნდა მოვიდეს notification

### Optional: Install PWA

1. Chrome → Menu (⋮) → "Install app" or "Add to Home Screen"
2. ხატულა დაემატება Home Screen-ზე
3. გახსენი installed app-ი

---

## Debug Commands

### Check Service Worker Status:
```javascript
// Browser Console:
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg?.active?.state);
});
```

### Check Push Subscription:
```javascript
// Browser Console:
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

### Check Permission:
```javascript
// Browser Console:
console.log('Notification permission:', Notification.permission);
```

### Force Service Worker Update:
```javascript
// Browser Console:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
  location.reload();
});
```

---

## Common Issues & Solutions

### Issue 1: "Missing VAPID Key"
**გადაწყვეტა**:
- შეამოწმე `.env` ფაილში `VITE_VAPID_PUBLIC_KEY` არის?
- Restart dev server: `npm run dev`

### Issue 2: Edge Function Errors
**გადაწყვეტა**:
```bash
# Check function logs:
supabase functions logs send-web-push
supabase functions logs notify-new-message
```

### Issue 3: Webhook არ ტრიგერდება
**გადაწყვეტა**:
- Supabase Dashboard → Database → Webhooks → შეამოწმე Status
- ხელით Test Webhook გაუშვი
- შეამოწმე URL და Authorization header

### Issue 4: Notification არ მოდის
**Debug Steps**:
1. შეამოწმე subscription database-ში არსებობს?
2. Test send-web-push function manually (curl)
3. შეამოწმე browser console errors
4. შეამოწმე service worker console logs

---

## Next Steps

ეს Quick Start გაძლევს საბაზისო დანერგვას. დამატებითი features-ისთვის იხილეთ:

- **სრული დოკუმენტაცია**: `/home/bekolozi/Desktop/duality-comms/PWA-PUSH-NOTIFICATIONS-PROJECT-PLAN.md`
- **ქართული გეგმა**: `/home/bekolozi/Desktop/duality-comms/PUSH-NOTIFICATIONS-ROADMAP-GEO.md`

**Optional Features რომლებიც შეგიძლია დაამატო**:
- Chat-ის Mute functionality
- Notification preferences (per chat)
- Do Not Disturb hours
- In-app notification center

---

**ბოლო განახლება**: 2025-10-29
**მდგომარეობა**: მზადაა გამოყენებისთვის
