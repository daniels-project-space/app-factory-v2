// ReviewPulse — generate-reply Edge Function
// Generates an AI-drafted reply to a review using Claude Haiku
// Called from the review detail screen when user taps "Draft Reply"
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

// --- Prompt ---

function buildPrompt(params: {
  review_text: string | null;
  rating: number | null;
  reviewer_name: string | null;
  platform: string;
  business_name: string;
  business_type: string | null;
}): string {
  const { review_text, rating, reviewer_name, platform, business_name, business_type } = params;

  const ratingContext =
    rating !== null
      ? rating >= 4
        ? "This is a positive review. Be thankful and warm."
        : rating >= 3
          ? "This is a neutral review. Be appreciative but address any concerns."
          : "This is a negative review. Be empathetic, apologize if appropriate, and offer to make things right."
      : "";

  const nameGreeting = reviewer_name ? `Hi ${reviewer_name.split(" ")[0]}` : "Hi there";

  return `You are a professional review reply writer for ${business_name}${business_type ? `, a ${business_type} business` : ""}. Write a reply to this ${platform} review.

REVIEW TEXT: ${review_text ?? "(No text, rating only)"}
RATING: ${rating ?? "Unknown"}/5 stars
REVIEWER: ${reviewer_name ?? "Anonymous"}

${ratingContext}

RULES:
- Start with "${nameGreeting}" or similar natural greeting
- Keep it under 120 words — concise and genuine
- Match the tone: warm for positive, empathetic for negative, balanced for neutral
- Never be defensive or argumentative
- For negative reviews: acknowledge the issue, apologize briefly, offer a path forward (e.g. "please reach out to us directly")
- For positive reviews: thank them specifically for what they mentioned, invite them back
- Sound like a real business owner, NOT like a corporate template
- Do NOT use marketing buzzwords, exclamation marks in excess, or overly formal language
- Do NOT mention competitors or make promises you can't keep
- Write ONLY the reply text — no subject line, no sign-off signature, no "Dear customer"

Reply:`;
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

    // Verify the user's JWT and get user_id
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Check Pro status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (!profile?.is_pro) {
      return new Response(
        JSON.stringify({ error: "Pro subscription required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { review_id, review_text, rating, reviewer_name, platform } = body;

    if (!review_id) {
      return new Response(
        JSON.stringify({ error: "review_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Get business info for context — verify ownership
    const { data: reviewRow } = await supabase
      .from("reviews")
      .select("business_profile_id, user_id")
      .eq("id", review_id)
      .single();

    if (!reviewRow || reviewRow.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Review not found or access denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    let businessName = "Our Business";
    let businessType: string | null = null;

    if (reviewRow?.business_profile_id) {
      const { data: bp } = await supabase
        .from("business_profiles")
        .select("business_name")
        .eq("id", reviewRow.business_profile_id)
        .single();
      if (bp?.business_name) businessName = bp.business_name;
    }

    // Get business type from user profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("business_type")
      .eq("id", user.id)
      .single();
    if (userProfile?.business_type) businessType = userProfile.business_type;

    // Call Claude Haiku API
    const prompt = buildPrompt({
      review_text,
      rating,
      reviewer_name,
      platform: platform ?? "google",
      business_name: businessName,
      business_type: businessType,
    });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", detail: errText.slice(0, 200) }),
        { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const aiResponse = await anthropicRes.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const draft = aiResponse.content?.[0]?.text?.trim() ?? "";

    if (!draft) {
      return new Response(
        JSON.stringify({ error: "AI returned empty response" }),
        { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Save draft to reviews table
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ ai_draft: draft })
      .eq("id", review_id);

    if (updateError) {
      console.error("Failed to save draft:", updateError);
    }

    return new Response(
      JSON.stringify({ draft }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  } catch (err) {
    console.error("generate-reply error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
