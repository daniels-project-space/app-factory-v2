// ReviewPulse — poll-reviews Edge Function
// Called by pg_cron every 15 minutes (or manually via POST)
// For each active Google business profile:
//   1. Refresh OAuth token if needed
//   2. Fetch reviews from GBP API
//   3. Upsert into reviews table (deduplication by platform_review_id)
//   4. Update business_profiles.last_polled_at + stats
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   TOKEN_ENCRYPTION_KEY
//   YELP_FUSION_API_KEY (optional — Yelp polling skipped if absent)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const ENCRYPTION_KEY = Deno.env.get("TOKEN_ENCRYPTION_KEY")!;
const YELP_API_KEY = Deno.env.get("YELP_FUSION_API_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── AES-256-GCM crypto helpers ────────────────────────────────────────────────

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

// ─── GBP helpers ───────────────────────────────────────────────────────────────

// Google star rating enum → number
const STAR_MAP: Record<string, number> = {
  STAR_RATING_UNSPECIFIED: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

type GBPReview = {
  reviewId: string;
  reviewer: { displayName?: string; profilePhotoUrl?: string };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
};

// Refresh a GBP OAuth access token using the stored refresh token
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

// ─── Poll a single business profile ───────────────────────────────────────────

type ProfileRow = {
  id: string;
  user_id: string;
  platform_id: string | null;
  place_id: string | null;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_expires_at: string;
};

async function pollProfile(
  supabase: ReturnType<typeof createClient>,
  profile: ProfileRow
): Promise<{ success: boolean; newReviews: number; error?: string }> {
  let accessToken: string;

  try {
    // ── Token refresh if expired (within 5-minute buffer) ──
    const expiresAt = new Date(profile.token_expires_at).getTime();
    const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000;

    if (needsRefresh) {
      if (!profile.refresh_token_enc) {
        // Mark profile as disconnected — user must reconnect
        await supabase
          .from("business_profiles")
          .update({ is_active: false })
          .eq("id", profile.id);
        return { success: false, newReviews: 0, error: "No refresh token — profile deactivated" };
      }

      const refreshToken = await decryptToken(profile.refresh_token_enc);
      const refreshed = await refreshAccessToken(refreshToken);

      if (!refreshed) {
        await supabase
          .from("business_profiles")
          .update({ is_active: false })
          .eq("id", profile.id);
        return { success: false, newReviews: 0, error: "Token refresh failed — profile deactivated" };
      }

      accessToken = refreshed.access_token;
      const newEncrypted = await encryptToken(accessToken);
      await supabase
        .from("business_profiles")
        .update({
          access_token_enc: newEncrypted,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", profile.id);
    } else {
      accessToken = await decryptToken(profile.access_token_enc);
    }

    // ── Fetch reviews from GBP API ─────────────────────────────────────────
    if (!profile.platform_id) {
      return { success: false, newReviews: 0, error: "No platform_id (GBP location name) set" };
    }

    // GBP API endpoint: accounts/{account}/locations/{location}/reviews
    const reviewsUrl = `https://mybusiness.googleapis.com/v4/${profile.platform_id}/reviews?pageSize=50&orderBy=updateTime+desc`;
    const reviewsRes = await fetch(reviewsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!reviewsRes.ok) {
      const errText = await reviewsRes.text();
      return {
        success: false,
        newReviews: 0,
        error: `GBP API ${reviewsRes.status}: ${errText.slice(0, 200)}`,
      };
    }

    const reviewsData = await reviewsRes.json() as { reviews?: GBPReview[]; totalReviewCount?: number };
    const gbpReviews = reviewsData.reviews ?? [];

    // ── Upsert reviews ─────────────────────────────────────────────────────
    let upserted = 0;
    for (const gbpReview of gbpReviews) {
      const rating = STAR_MAP[gbpReview.starRating] ?? null;
      const reviewDate = gbpReview.updateTime ?? gbpReview.createTime ?? null;

      // Check if this review already exists
      const { data: existing } = await supabase
        .from("reviews")
        .select("id, owner_reply")
        .eq("business_profile_id", profile.id)
        .eq("platform_review_id", gbpReview.reviewId)
        .maybeSingle();

      const reviewPayload: Record<string, unknown> = {
        user_id: profile.user_id,
        business_profile_id: profile.id,
        platform: "google" as const,
        platform_review_id: gbpReview.reviewId,
        reviewer_name: gbpReview.reviewer?.displayName ?? null,
        reviewer_avatar_url: gbpReview.reviewer?.profilePhotoUrl ?? null,
        rating: rating !== 0 ? rating : null,
        review_text: gbpReview.comment ?? null,
        review_url: profile.place_id
          ? `https://search.google.com/local/reviews?placeid=${profile.place_id}`
          : null,
        owner_reply: gbpReview.reviewReply?.comment ?? null,
        replied_at: gbpReview.reviewReply?.updateTime ?? null,
        review_date: reviewDate,
        // Only set is_new on INSERT (new reviews). Omit on UPDATE to preserve user's read state.
        ...(existing ? {} : { is_new: true }),
      };

      const { error: upsertError } = await supabase
        .from("reviews")
        .upsert(reviewPayload, {
          onConflict: "business_profile_id,platform_review_id",
        });

      if (!upsertError) upserted++;
    }

    // ── Update business profile stats ──────────────────────────────────────
    const ratedReviews = gbpReviews.filter((r) => STAR_MAP[r.starRating] > 0);
    const avgRating =
      ratedReviews.length > 0
        ? ratedReviews.reduce((sum, r) => sum + STAR_MAP[r.starRating], 0) / ratedReviews.length
        : null;

    await supabase
      .from("business_profiles")
      .update({
        last_polled_at: new Date().toISOString(),
        total_reviews: reviewsData.totalReviewCount ?? gbpReviews.length,
        current_rating: avgRating ? Math.round(avgRating * 100) / 100 : null,
      })
      .eq("id", profile.id);

    return { success: true, newReviews: upserted };

  } catch (err) {
    return { success: false, newReviews: 0, error: String(err) };
  }
}

// ─── Yelp helpers ────────────────────────────────────────────────────────────

type YelpReview = {
  id: string;
  url: string;
  text: string;
  rating: number;
  time_created: string;
  user: { id: string; name: string; image_url: string | null };
};

type YelpProfileRow = {
  id: string;
  user_id: string;
  platform_id: string; // Yelp business ID (e.g. "joes-plumbing-brooklyn")
  business_name: string;
};

async function pollYelpProfile(
  supabase: ReturnType<typeof createClient>,
  profile: YelpProfileRow
): Promise<{ success: boolean; newReviews: number; error?: string }> {
  try {
    // Fetch reviews from Yelp Fusion API (returns up to 3 recent excerpts)
    const reviewsRes = await fetch(
      `https://api.yelp.com/v3/businesses/${profile.platform_id}/reviews?limit=20&sort_by=newest`,
      {
        headers: {
          Authorization: `Bearer ${YELP_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!reviewsRes.ok) {
      const errText = await reviewsRes.text();
      return {
        success: false,
        newReviews: 0,
        error: `Yelp API ${reviewsRes.status}: ${errText.slice(0, 200)}`,
      };
    }

    const reviewsData = await reviewsRes.json() as {
      reviews: YelpReview[];
      total: number;
      possible_languages: string[];
    };
    const yelpReviews = reviewsData.reviews ?? [];

    // Also fetch business details for updated stats
    const bizRes = await fetch(
      `https://api.yelp.com/v3/businesses/${profile.platform_id}`,
      {
        headers: {
          Authorization: `Bearer ${YELP_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    let bizRating: number | null = null;
    let bizReviewCount = 0;
    let bizUrl = "";
    if (bizRes.ok) {
      const bizData = await bizRes.json() as {
        rating: number;
        review_count: number;
        url: string;
      };
      bizRating = bizData.rating;
      bizReviewCount = bizData.review_count;
      bizUrl = bizData.url;
    }

    // Upsert reviews
    let upserted = 0;
    for (const yelpReview of yelpReviews) {
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("business_profile_id", profile.id)
        .eq("platform_review_id", yelpReview.id)
        .maybeSingle();

      const reviewPayload: Record<string, unknown> = {
        user_id: profile.user_id,
        business_profile_id: profile.id,
        platform: "yelp" as const,
        platform_review_id: yelpReview.id,
        reviewer_name: yelpReview.user?.name ?? null,
        reviewer_avatar_url: yelpReview.user?.image_url ?? null,
        rating: yelpReview.rating,
        review_text: yelpReview.text ?? null,
        review_url: yelpReview.url ?? bizUrl,
        owner_reply: null, // Yelp API doesn't return owner replies
        replied_at: null,
        review_date: yelpReview.time_created
          ? new Date(yelpReview.time_created).toISOString()
          : null,
        // Only set is_new on INSERT. Omit on UPDATE to preserve user's read state.
        ...(existing ? {} : { is_new: true }),
      };

      const { error: upsertError } = await supabase
        .from("reviews")
        .upsert(reviewPayload, {
          onConflict: "business_profile_id,platform_review_id",
        });

      if (!upsertError) upserted++;
    }

    // Update business profile stats
    await supabase
      .from("business_profiles")
      .update({
        last_polled_at: new Date().toISOString(),
        total_reviews: bizReviewCount || yelpReviews.length,
        current_rating: bizRating,
        review_link: bizUrl || null,
      })
      .eq("id", profile.id);

    return { success: true, newReviews: upserted };
  } catch (err) {
    return { success: false, newReviews: 0, error: String(err) };
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Verify cron secret — this endpoint should only be called by pg_cron
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    if (CRON_SECRET) {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const results: Array<{
      profileId: string;
      platform: string;
      success: boolean;
      newReviews: number;
      error?: string;
    }> = [];
    let totalNew = 0;

    // ── 1. Poll Google profiles ──────────────────────────────────────────
    const { data: googleProfiles, error: googleError } = await supabase
      .from("business_profiles")
      .select("id, user_id, platform_id, place_id, access_token_enc, refresh_token_enc, token_expires_at")
      .eq("platform", "google")
      .eq("is_active", true)
      .not("access_token_enc", "is", null);

    if (googleError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch Google profiles", detail: googleError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    for (const profile of (googleProfiles ?? []) as ProfileRow[]) {
      const result = await pollProfile(supabase, profile);
      results.push({ profileId: profile.id, platform: "google", ...result });
      totalNew += result.newReviews;
    }

    // ── 2. Poll Yelp profiles (only if API key configured) ───────────────
    if (YELP_API_KEY) {
      const { data: yelpProfiles, error: yelpError } = await supabase
        .from("business_profiles")
        .select("id, user_id, platform_id, business_name")
        .eq("platform", "yelp")
        .eq("is_active", true)
        .not("platform_id", "is", null);

      if (!yelpError && yelpProfiles?.length) {
        for (const profile of yelpProfiles as YelpProfileRow[]) {
          const result = await pollYelpProfile(supabase, profile);
          results.push({ profileId: profile.id, platform: "yelp", ...result });
          totalNew += result.newReviews;
        }
      }
    }

    const totalPolled = results.length;

    if (totalPolled === 0) {
      return new Response(
        JSON.stringify({ message: "No active profiles to poll", polled: 0 }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Poll complete",
        polled: totalPolled,
        totalNewReviews: totalNew,
        results,
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
