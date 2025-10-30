import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  message_id: string;
  chat_id: string;
  sender_id: string;
  message_text?: string;
  is_staff_only?: boolean;
}

interface ChatMemberSubscription {
  user_id: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  endpoint: string;
  full_name: string;
  email: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function initVapid() {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!pub || !priv) {
    throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY");
  }

  webpush.setVapidDetails("mailto:admin@dualchat.app", pub, priv);
}

async function deleteSubscriptionByEndpoint(supabase: any, endpoint: string) {
  await supabase
    .from("web_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize VAPID keys
    initVapid();

    // Parse request body
    const body: RequestBody = await req.json();
    const { message_id, chat_id, sender_id, message_text, is_staff_only } = body;

    if (!message_id || !chat_id || !sender_id) {
      throw new Error("Missing required fields: message_id, chat_id, sender_id");
    }

    // Initialize Supabase client
    const supabase = getSupabaseClient();

    // Get chat details and sender profile
    const [chatResult, senderResult] = await Promise.all([
      supabase
        .from("chats")
        .select("client_name, company_name, organization_id")
        .eq("id", chat_id)
        .single(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sender_id)
        .single()
    ]);

    if (chatResult.error) {
      throw new Error(`Failed to fetch chat: ${chatResult.error.message}`);
    }

    if (senderResult.error) {
      throw new Error(`Failed to fetch sender: ${senderResult.error.message}`);
    }

    const chat = chatResult.data;
    const sender = senderResult.data;

    // Get all push subscriptions for chat members (excluding sender)
    const { data: subscriptions, error: subsError } = await supabase
      .rpc("get_chat_member_subscriptions", {
        p_chat_id: chat_id,
        p_exclude_user_id: sender_id
      });

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: "No subscriptions found for chat members"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prepare notification payload
    const chatTitle = chat.client_name || chat.company_name || "DualChat";
    const messagePreview = message_text
      ? (message_text.length > 100 ? message_text.substring(0, 100) + "..." : message_text)
      : "New message";

    const notificationPayload = {
      title: chatTitle,
      body: `${sender.full_name}: ${messagePreview}`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: `chat-${chat_id}`,
      data: {
        url: `/?chat=${chat_id}`,
        chat_id,
        message_id,
        sender_id,
        is_staff_only: is_staff_only || false,
      },
    };

    // Send notifications to all subscriptions
    const results = [];
    let successCount = 0;

    for (const sub of subscriptions as ChatMemberSubscription[]) {
      try {
        const pushSubscription = {
          endpoint: sub.subscription.endpoint,
          keys: {
            p256dh: sub.subscription.keys.p256dh,
            auth: sub.subscription.keys.auth,
          },
        };

        const res = await webpush.sendNotification(
          pushSubscription as any,
          JSON.stringify(notificationPayload)
        );

        results.push({
          user_id: sub.user_id,
          endpoint: sub.endpoint,
          status: res.statusCode,
          success: true,
        });

        successCount++;
      } catch (err: any) {
        // Clean up expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await deleteSubscriptionByEndpoint(supabase, sub.endpoint);
          results.push({
            user_id: sub.user_id,
            endpoint: sub.endpoint,
            error: "Subscription expired (cleaned up)",
            success: false,
          });
        } else {
          results.push({
            user_id: sub.user_id,
            endpoint: sub.endpoint,
            error: err?.message || String(err),
            success: false,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-new-message:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
