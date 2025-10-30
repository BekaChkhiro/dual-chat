import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = { title?: string; body?: string; url?: string; data?: Record<string, unknown> };

interface RequestBody {
  user_id?: string;
  payload: Payload;
}

function getSupabaseRest() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return { url, key };
}

async function fetchUserSubscriptions(userId: string) {
  const { url, key } = getSupabaseRest();
  const resp = await fetch(`${url}/rest/v1/web_push_subscriptions?user_id=eq.${userId}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!resp.ok) throw new Error(`Fetch subscriptions failed: ${resp.status}`);
  return await resp.json();
}

async function deleteSubscriptionByEndpoint(endpoint: string) {
  const { url, key } = getSupabaseRest();
  await fetch(`${url}/rest/v1/web_push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
}

function initVapid() {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) throw new Error("Missing VAPID keys");
  webpush.setVapidDetails("mailto:admin@workchat.app", pub, priv);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    initVapid();
    const { user_id, payload }: RequestBody = await req.json();
    if (!payload) throw new Error("Missing payload");

    const finalPayload = {
      title: payload.title ?? "WorkChat",
      body: payload.body ?? "New notification",
      data: { url: payload.url ?? "/", ...(payload.data ?? {}) },
    };

    let subs: any[] = [];
    if (user_id) subs = await fetchUserSubscriptions(user_id);
    else throw new Error("user_id is required");

    const results = [] as any[];
    for (const s of subs) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        const res = await webpush.sendNotification(subscription as any, JSON.stringify(finalPayload));
        results.push({ endpoint: s.endpoint, status: res.statusCode });
      } catch (err: any) {
        // Clean up gone subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await deleteSubscriptionByEndpoint(s.endpoint);
        }
        results.push({ endpoint: s.endpoint, error: err?.message ?? String(err) });
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

