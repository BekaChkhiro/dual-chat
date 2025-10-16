import { supabase } from "@/integrations/supabase/client";

// Convert a Base64URL string to a Uint8Array (for VAPID key)
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) outputArray[i] = raw.charCodeAt(i);
  return outputArray;
}

function bufToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function enablePushForCurrentUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' } as const;
  }

  // iOS requires installed PWA (standalone) and iOS 16.4+
  // Permission request must be from a user gesture in your UI.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' } as const;
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Already subscribed
    return { ok: true, reason: 'already' } as const;
  }

  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapid) {
    return { ok: false, reason: 'missing_vapid' } as const;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(vapid),
  });

  const keyAuth = sub.getKey('auth');
  const keyP256 = sub.getKey('p256dh');
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  await supabase.from('web_push_subscriptions').upsert(
    {
      user_id: user?.id ?? null,
      endpoint: sub.endpoint,
      auth: keyAuth ? bufToBase64url(keyAuth) : null,
      p256dh: keyP256 ? bufToBase64url(keyP256) : null,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' as any }
  );

  return { ok: true, reason: 'subscribed' } as const;
}

export async function disablePushForCurrentUser() {
  if (!('serviceWorker' in navigator)) return { ok: false } as const;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true } as const;
  await supabase.from('web_push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
  return { ok: true } as const;
}

