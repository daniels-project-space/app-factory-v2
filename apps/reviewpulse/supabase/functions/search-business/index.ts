// ReviewPulse — search-business Edge Function
// Searches Google Places API (Text Search) for businesses by name/address
// Used during onboarding to find and connect user's Google Business Profile
//
// NEEDS_CONFIG: Requires GOOGLE_PLACES_API_KEY env var on Supabase
//   This should be a Google Cloud API key with Places API enabled
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_PLACES_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Parse request body
    const { query } = (await req.json()) as { query: string };

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }

    // Check if Google Places API key is configured
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in Supabase secrets.",
          needs_config: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }

    // Call Google Places Text Search API
    const searchUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/textsearch/json"
    );
    searchUrl.searchParams.set("query", query.trim());
    searchUrl.searchParams.set("type", "establishment");
    searchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    const placesRes = await fetch(searchUrl.toString());

    if (!placesRes.ok) {
      const errText = await placesRes.text();
      console.error("Google Places API error:", errText);
      return new Response(
        JSON.stringify({
          error: "Google Places API request failed",
          detail: errText,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }

    const placesData = (await placesRes.json()) as {
      status: string;
      results: Array<{
        place_id: string;
        name: string;
        formatted_address: string;
        rating?: number;
        user_ratings_total?: number;
        types?: string[];
        geometry?: {
          location: { lat: number; lng: number };
        };
      }>;
      error_message?: string;
    };

    if (
      placesData.status !== "OK" &&
      placesData.status !== "ZERO_RESULTS"
    ) {
      return new Response(
        JSON.stringify({
          error: "Google Places search failed",
          detail: placesData.error_message ?? placesData.status,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        }
      );
    }

    // Return top 10 results
    const results = (placesData.results ?? []).slice(0, 10).map((r) => ({
      place_id: r.place_id,
      name: r.name,
      formatted_address: r.formatted_address,
      rating: r.rating ?? 0,
      user_ratings_total: r.user_ratings_total ?? 0,
      types: r.types ?? [],
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    console.error("search-business error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }
});
