// ReviewPulse — connect-google Edge Function
// Handles Google Business Profile OAuth:
//   GET  → generate OAuth authorization URL and return it to the client
//   POST → exchange auth code for tokens, store encrypted in business_profiles
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   TOKEN_ENCRYPTION_KEY (32-char random string for AES-256-GCM)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const ENCRYPTION_KEY = Deno.env.get("TOKEN_ENCRYPTION_KEY")!;

// Google Business Profile OAuth scopes
const GBP_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
].join(" ");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── AES-256-GCM token encryption ─────────────────────────────────────────────

async function encryptToken(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encoder.encode(plaintext)
  );
  // Prepend IV to ciphertext, base64-encode result
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify JWT — get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const url = new URL(req.url);

    // ── GET: Generate OAuth URL ──────────────────────────────────────────────
    if (req.method === "GET") {
      const redirectUri = req.headers.get("X-Redirect-Uri") ??
        `${url.origin}/functions/v1/connect-google/callback`;

      // State encodes userId + timestamp for CSRF protection
      const state = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }));

      const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      oauthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set("redirect_uri", redirectUri);
      oauthUrl.searchParams.set("response_type", "code");
      oauthUrl.searchParams.set("scope", GBP_SCOPES);
      oauthUrl.searchParams.set("access_type", "offline");
      oauthUrl.searchParams.set("prompt", "consent"); // Always get refresh_token
      oauthUrl.searchParams.set("state", state);

      return new Response(
        JSON.stringify({ url: oauthUrl.toString() }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // ── POST: Exchange auth code for tokens ──────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const { code, redirectUri, businessName } = body as {
        code: string;
        redirectUri: string;
        businessName?: string;
      };

      if (!code || !redirectUri) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: code, redirectUri" }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      // Exchange authorization code for OAuth tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        return new Response(
          JSON.stringify({ error: "Token exchange failed", detail: errBody }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      const tokens = await tokenRes.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const { access_token, refresh_token, expires_in } = tokens;

      // Encrypt tokens before storing in DB
      const accessEnc = await encryptToken(access_token);
      const refreshEnc = refresh_token ? await encryptToken(refresh_token) : null;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Attempt to fetch GBP account + first location for auto-fill
      let detectedBusinessName = businessName ?? null;
      let placeId: string | null = null;
      let platformId: string | null = null;
      let reviewLink: string | null = null;
      let locations: unknown[] = [];

      try {
        // Fetch Google accounts
        const accountsRes = await fetch(
          "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
          { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (accountsRes.ok) {
          const accountData = await accountsRes.json() as {
            accounts?: Array<{ name: string; accountName: string }>;
          };
          const account = accountData.accounts?.[0];

          if (account) {
            // Fetch locations for this account
            const locsRes = await fetch(
              `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,metadata`,
              { headers: { Authorization: `Bearer ${access_token}` } }
            );

            if (locsRes.ok) {
              const locsData = await locsRes.json() as {
                locations?: Array<{
                  name: string;
                  title?: string;
                  metadata?: { placeId?: string; newReviewUri?: string };
                }>;
              };
              locations = locsData.locations ?? [];
              const first = locsData.locations?.[0];
              if (first) {
                detectedBusinessName = detectedBusinessName ?? first.title ?? null;
                placeId = first.metadata?.placeId ?? null;
                platformId = first.name ?? null;
                reviewLink = first.metadata?.newReviewUri ??
                  (placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null);
              }
            }
          }
        }
      } catch (_) {
        // GBP API call failed — continue with saving tokens anyway
        // User can reconnect if needed
      }

      // Upsert business profile — on conflict (same user+platform+location), update tokens
      const { error: upsertError } = await supabase
        .from("business_profiles")
        .upsert(
          {
            user_id: user.id,
            platform: "google",
            business_name: detectedBusinessName ?? "My Business",
            place_id: placeId,
            platform_id: platformId,
            review_link: reviewLink,
            access_token_enc: accessEnc,
            refresh_token_enc: refreshEnc,
            token_expires_at: expiresAt,
            is_active: true,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform,platform_id" }
        );

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: "Failed to save business profile", detail: upsertError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          businessName: detectedBusinessName,
          placeId,
          locations,
        }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
