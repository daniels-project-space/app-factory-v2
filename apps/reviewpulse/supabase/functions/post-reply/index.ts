// ReviewPulse — post-reply Edge Function
// Posts an owner reply to a Google Business Profile review via GBP API
// Called from the review detail screen when user taps "Post Reply"
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   TOKEN_ENCRYPTION_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const ENCRYPTION_KEY = Deno.env.get("TOKEN_ENCRYPTION_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- AES-256-GCM crypto helpers (same as poll-reviews) ---

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(ciphertext: string): Promise<string> {
  const key = await getKey();
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}

// --- Token refresh ---

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { review_id, reply_text } = body;

    if (!review_id || !reply_text?.trim()) {
      return new Response(
        JSON.stringify({ error: "review_id and reply_text are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Fetch the review + its business profile
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id, platform, platform_review_id, business_profile_id, user_id")
      .eq("id", review_id)
      .single();

    if (reviewError || !review) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Verify ownership
    if (review.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not your review" }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Get the business profile with OAuth tokens
    const { data: bp, error: bpError } = await supabase
      .from("business_profiles")
      .select("id, platform_id, access_token_enc, refresh_token_enc, token_expires_at")
      .eq("id", review.business_profile_id)
      .single();

    if (bpError || !bp) {
      return new Response(
        JSON.stringify({ error: "Business profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Only Google supports API reply posting currently
    if (review.platform !== "google") {
      // For non-Google platforms, just save the reply locally
      await supabase
        .from("reviews")
        .update({
          owner_reply: reply_text.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq("id", review_id);

      return new Response(
        JSON.stringify({ success: true, posted_to_platform: false, message: "Reply saved locally (platform API reply not supported)" }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // --- Google Business Profile API reply ---

    // Ensure valid access token
    let accessToken: string;
    const expiresAt = new Date(bp.token_expires_at).getTime();
    const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000;

    if (needsRefresh) {
      if (!bp.refresh_token_enc) {
        return new Response(
          JSON.stringify({ error: "OAuth token expired, please reconnect Google" }),
          { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const refreshToken = await decryptToken(bp.refresh_token_enc);
      const refreshed = await refreshAccessToken(refreshToken);

      if (!refreshed) {
        return new Response(
          JSON.stringify({ error: "Failed to refresh OAuth token, please reconnect Google" }),
          { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      accessToken = refreshed.access_token;

      // Update stored token
      const newEncrypted = await encryptToken(accessToken);
      await supabase
        .from("business_profiles")
        .update({
          access_token_enc: newEncrypted,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", bp.id);
    } else {
      accessToken = await decryptToken(bp.access_token_enc);
    }

    // Post reply via GBP API
    // Endpoint: PUT accounts/{account}/locations/{location}/reviews/{review}/reply
    if (!bp.platform_id || !review.platform_review_id) {
      return new Response(
        JSON.stringify({ error: "Missing platform identifiers for API reply" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const replyUrl = `https://mybusiness.googleapis.com/v4/${bp.platform_id}/reviews/${review.platform_review_id}/reply`;

    const gbpRes = await fetch(replyUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: reply_text.trim() }),
    });

    if (!gbpRes.ok) {
      const errText = await gbpRes.text();
      console.error("GBP reply API error:", gbpRes.status, errText);

      // Still save the reply locally even if API posting fails
      await supabase
        .from("reviews")
        .update({
          owner_reply: reply_text.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq("id", review_id);

      return new Response(
        JSON.stringify({
          success: true,
          posted_to_platform: false,
          message: "Reply saved locally but failed to post to Google",
          gbp_error: errText.slice(0, 200),
        }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Success — update the review record
    await supabase
      .from("reviews")
      .update({
        owner_reply: reply_text.trim(),
        replied_at: new Date().toISOString(),
      })
      .eq("id", review_id);

    return new Response(
      JSON.stringify({ success: true, posted_to_platform: true }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  } catch (err) {
    console.error("post-reply error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
