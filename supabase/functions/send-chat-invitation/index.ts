import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  chatName: string;
  inviterName: string;
  invitationUrl: string;
  role: "team_member" | "client";
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-chat-invitation] Request received", {
    method: req.method,
    url: req.url,
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, chatName, inviterName, invitationUrl, role }: InvitationRequest =
      await req.json();

    console.log("[send-chat-invitation] Sending invitation", {
      email,
      chatName,
      role,
    });

    const roleText = role === "team_member" ? "Team Member" : "Client";

    const emailResponse = await resend.emails.send({
      from: "WorkChat <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${chatName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">You've been invited!</h1>
          <p style="font-size: 16px; color: #666;">
            <strong>${inviterName}</strong> has invited you to join the chat <strong>${chatName}</strong>
            as a <strong>${roleText}</strong>.
          </p>
          <p style="font-size: 16px; color: #666;">
            Click the button below to accept the invitation and create your account:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #999;">
            Or copy and paste this link into your browser:<br>
            <a href="${invitationUrl}" style="color: #4F46E5;">${invitationUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">
            This invitation link will expire in 7 days. If you didn't expect this invitation,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("[send-chat-invitation] Email sent successfully", {
      emailId: emailResponse.data?.id,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[send-chat-invitation] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
