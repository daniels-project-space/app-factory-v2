// ReviewPulse — generate-insights Edge Function
// Generates a 1-2 sentence AI insight about review performance using Claude Haiku
// Called from the Analytics dashboard. Pro-gated (caller must be Pro).
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   ANTHROPIC_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const user_id = user.id;
    const { period } = await req.json();

    // Verify Pro status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro, business_name")
      .eq("id", user_id)
      .single();

    if (!profile?.is_pro) {
      return new Response(
        JSON.stringify({ error: "Pro subscription required" }),
        { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Determine time window
    const days = period === "1y" ? 365 : period === "90d" ? 90 : 30;
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString();

    // Fetch review stats for the period
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating, review_date, owner_reply, platform, review_text")
      .eq("user_id", user_id)
      .gte("review_date", cutoffDate)
      .order("review_date", { ascending: false })
      .limit(100);

    if (!reviews || reviews.length === 0) {
      return new Response(
        JSON.stringify({ insight: "No reviews in this period yet. Send some review requests to get started." }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Compute stats for the prompt
    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / totalReviews;
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    const oneToTwoCount = reviews.filter((r) => r.rating && r.rating <= 2).length;
    const repliedCount = reviews.filter((r) => r.owner_reply).length;
    const responseRate = Math.round((repliedCount / totalReviews) * 100);

    // Sample recent review themes (take last 10 review texts)
    const recentTexts = reviews
      .filter((r) => r.review_text)
      .slice(0, 10)
      .map((r) => `${r.rating}★: "${r.review_text?.slice(0, 100)}"`)
      .join("\n");

    // Platforms
    const platforms: Record<string, number> = {};
    for (const r of reviews) {
      platforms[r.platform] = (platforms[r.platform] ?? 0) + 1;
    }
    const platformSummary = Object.entries(platforms)
      .map(([p, c]) => `${p}: ${c}`)
      .join(", ");

    const periodLabel = period === "1y" ? "past year" : period === "90d" ? "past 90 days" : "past 30 days";

    const prompt = `You are an analytics assistant for a small business review management app. Generate exactly 1-2 concise, actionable sentences about this business's review performance. Be specific with numbers. Use a supportive but direct tone.

Business: ${profile.business_name ?? "This business"}
Period: ${periodLabel}
Total reviews: ${totalReviews}
Average rating: ${avgRating.toFixed(1)}/5
5-star reviews: ${fiveStarCount} (${Math.round((fiveStarCount / totalReviews) * 100)}%)
1-2 star reviews: ${oneToTwoCount}
Response rate: ${responseRate}%
Platforms: ${platformSummary}

Recent review excerpts:
${recentTexts || "No text reviews available."}

Generate a brief insight. Focus on the most actionable finding: a trend, an opportunity, or a risk. Do NOT start with "Your" or "Based on". Start with a specific observation.`;

    // Call Claude Haiku
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const insight =
      data.content?.[0]?.text?.trim() ??
      "Unable to generate insight at this time.";

    return new Response(
      JSON.stringify({ insight, generated_at: new Date().toISOString() }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-insights error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
