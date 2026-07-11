// ReviewPulse — yelp-search Edge Function
// Searches Yelp Fusion API for businesses by name + location
// Used during the Yelp connect flow — user searches for their business
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   YELP_FUSION_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const YELP_API_KEY = Deno.env.get("YELP_FUSION_API_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type YelpBusiness = {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  url: string;
  image_url: string;
  location: {
    display_address: string[];
    city: string;
    state: string;
    zip_code: string;
  };
  categories: Array<{ alias: string; title: string }>;
  phone: string;
  is_closed: boolean;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
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

    // Check Pro status
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_tier !== "pro") {
      return new Response(
        JSON.stringify({ error: "Pro subscription required for Yelp integration" }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Parse request body
    const { term, location } = await req.json() as { term: string; location: string };

    if (!term || !location) {
      return new Response(
        JSON.stringify({ error: "Both 'term' and 'location' are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    if (!YELP_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Yelp API not configured" }),
        { status: 503, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Search Yelp Fusion API
    const params = new URLSearchParams({
      term: term.trim(),
      location: location.trim(),
      limit: "10",
      sort_by: "best_match",
    });

    const yelpRes = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${YELP_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!yelpRes.ok) {
      const errText = await yelpRes.text();
      return new Response(
        JSON.stringify({
          error: "Yelp API error",
          detail: errText.slice(0, 200),
        }),
        { status: yelpRes.status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const yelpData = await yelpRes.json() as { businesses: YelpBusiness[]; total: number };

    // Map to simplified response
    const results = (yelpData.businesses ?? [])
      .filter((b) => !b.is_closed)
      .map((b) => ({
        yelp_id: b.id,
        name: b.name,
        rating: b.rating,
        review_count: b.review_count,
        address: b.location.display_address.join(", "),
        city: b.location.city,
        state: b.location.state,
        zip: b.location.zip_code,
        url: b.url,
        image_url: b.image_url,
        categories: b.categories.map((c) => c.title),
        phone: b.phone,
      }));

    return new Response(
      JSON.stringify({ results, total: yelpData.total ?? 0 }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
