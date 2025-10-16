Web Push Notifications (PWA)
===========================

This repo includes a minimal Web Push setup for the PWA:
- Client helpers to subscribe the current user
- Service worker handlers for `push` and notification clicks
- Supabase table + RLS for storing subscriptions
- Supabase Edge Function to send notifications using VAPID

1) Generate VAPID keys
----------------------
Run on your machine:

```
npx web-push generate-vapid-keys
```

Copy the keys:
- `PUBLIC_KEY` → add to your `.env` as `VITE_VAPID_PUBLIC_KEY="<publicKey>"`
- `PRIVATE_KEY` → set as a Supabase secret (not in the repo):

```
supabase secrets set VAPID_PUBLIC_KEY="<publicKey>" VAPID_PRIVATE_KEY="<privateKey>"
```

2) Apply DB migration
---------------------
The migration creates `public.web_push_subscriptions` with RLS.

```
supabase db push
```

3) Deploy the Edge Function
---------------------------
Deploy `send-web-push` and set required secrets (also needs service role key at runtime):

```
supabase secrets set SUPABASE_URL="<your-project-url>" SUPABASE_SERVICE_ROLE_KEY="<service-role>"
supabase functions deploy send-web-push
```

4) Enable push from the client
------------------------------
Call the helper from a user gesture (e.g., button click):

```ts
import { enablePushForCurrentUser } from '@/lib/push';

async function onEnableNotifications() {
  const res = await enablePushForCurrentUser();
  // res.reason: 'subscribed' | 'already' | 'denied' | 'unsupported' | 'missing_vapid'
}
```

5) Send a test notification
---------------------------
Invoke the function (server-side, admin tool, or from your app with proper auth):

```
curl -X POST \
  -H "Authorization: Bearer <anon-or-service>" \
  -H "Content-Type: application/json" \
  https://<your-project-url>/functions/v1/send-web-push \
  -d '{
    "user_id": "<target-user-id>",
    "payload": { "title": "DualChat", "body": "Test from PWA", "url": "/" }
  }'
```

iOS specifics
-------------
- Requires iOS 16.4+ and the app added to Home Screen (installed PWA).
- Permission prompt must be triggered from a user action.
- Notifications appear like native ones once granted.

Notes
-----
- Service worker: `public/sw.js` handles `push` and `notificationclick`.
- Client: `src/lib/push.ts` registers subscription and upserts to the table.
- Make sure the app is served over HTTPS (localhost is allowed for dev).

