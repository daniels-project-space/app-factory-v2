// ReviewPulse — send-push-notification Edge Function
// Triggered by database webhook on reviews INSERT
// Looks up user's Expo push tokens and sends notification about the new review
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type WebhookPayload = {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    user_id: string;
    platform: string;
    reviewer_name: string | null;
    rating: number | null;
    review_text: string | null;
    is_new: boolean;
  };
};

function buildNotificationBody(record: WebhookPayload["record"]) {
  const reviewer = record.reviewer_name ?? "Someone";
  const stars = record.rating ? "★".repeat(record.rating) : "";
  const platform = record.platform.charAt(0).toUpperCase() + record.platform.slice(1);

  let title: string;
  let body: string;

  if (record.rating && record.rating >= 4) {
    title = `${stars} New ${platform} Review!`;
    body = `${reviewer} left a ${record.rating}-star review${
      record.review_text ? `: "${record.review_text.slice(0, 80)}${record.review_text.length > 80 ? "..." : ""}"` : "."
    }`;
  } else if (record.rating && record.rating <= 2) {
    title = `⚠️ ${record.rating}-Star ${platform} Review`;
    body = `${reviewer} left a negative review${
      record.review_text ? `: "${record.review_text.slice(0, 80)}${record.review_text.length > 80 ? "..." : ""}"` : ". Tap to respond."
    }`;
  } else {
    title = `New ${platform} Review`;
    body = `${reviewer} left a ${record.rating ?? "new"}-star review${
      record.review_text ? `: "${record.review_text.slice(0, 80)}..."` : "."
    }`;
  }

  return { title, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Verify webhook secret (Supabase DB webhooks send this header)
    const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
    if (WEBHOOK_SECRET) {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
    }

    const payload = (await req.json()) as WebhookPayload;

    // Validate payload
    if (!payload.record?.user_id || !payload.record?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check user's notification preferences
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notifications_enabled")
      .eq("user_id", payload.record.user_id)
      .single();

    if (settings && settings.notifications_enabled === false) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "notifications_disabled" }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Get all push tokens for this user
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", payload.record.user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_push_tokens" }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Build notification content
    const { title, body } = buildNotificationBody(payload.record);

    // Send to all user's devices via Expo Push API
    const messages = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      sound: "default",
      badge: 1,
      data: {
        type: "new_review",
        review_id: payload.record.id,
        platform: payload.record.platform,
        rating: payload.record.rating,
      },
      channelId: "default",
      priority: payload.record.rating && payload.record.rating <= 2 ? "high" : "default",
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();

    // Log notification in database for the notification center
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: payload.record.user_id,
      type: "new_review",
      title,
      body,
      data: {
        review_id: payload.record.id,
        platform: payload.record.platform,
        rating: payload.record.rating,
      },
      read: false,
    });
    if (insertError) {
      console.error("Failed to log notification:", insertError);
    }

    return new Response(
      JSON.stringify({
        sent: true,
        devices: tokens.length,
        push_result: pushResult,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
