// eslint-disable-next-line import/no-unresolved
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 7-day rate limit window in milliseconds — 3 reflections per window (per ROADMAP 11.10)
const RATE_LIMIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// Max uses per rate-limit window
const RATE_LIMIT_MAX_USES = 3;

// Server-side model allowlist: client cannot escalate to a more expensive model
const ALLOWED_MODELS = new Set(['gpt-4o-mini', 'gpt-4o']);
// Hard ceiling on tokens regardless of what the client requests
const MAX_TOKENS_CAP = 600;
// Hard ceiling on total input characters across all messages (~8 000 tokens at ~4 chars/token)
const MAX_INPUT_CHARS = 32_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller has a valid Supabase session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Server-side subscription check ---
    // subscription_tier is set in user_settings.settings by the RevenueCat webhook.
    // Free-tier users are blocked here regardless of client-side paywall state.
    const { data: userSettingsRow } = await supabaseClient
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    const userSettingsData = (userSettingsRow?.settings ?? {}) as Record<string, unknown>;
    const subscriptionTier = (userSettingsData['subscription_tier'] as string | undefined) ?? 'free';

    if (subscriptionTier !== 'premium') {
      return new Response(JSON.stringify({ error: 'Premium subscription required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- CONFIGURE THIS: set OPENAI_API_KEY as a Supabase secret ---
    // Run: supabase secrets set OPENAI_API_KEY=sk-proj-...
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured on server' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse client request body
    const body = await req.json();
    const { messages } = body;

    // Guard: reject oversized input to prevent cost amplification by a malicious premium user
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const totalInputChars = messages.reduce((sum: number, m: { content?: unknown }) => {
      return sum + (typeof m.content === 'string' ? m.content.length : 0);
    }, 0);
    if (totalInputChars > MAX_INPUT_CHARS) {
      return new Response(
        JSON.stringify({ error: `Input exceeds maximum allowed size (${MAX_INPUT_CHARS} chars)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce server-side model allowlist: ignore any model the client supplies that is not
    // in ALLOWED_MODELS and default to the cheapest option. This prevents a premium subscriber
    // from passing model:'o1' or any other expensive model string.
    const requestedModel = typeof body.model === 'string' ? body.model : '';
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gpt-4o-mini';

    // Cap max_tokens regardless of client input to prevent runaway costs.
    const clientTokens = typeof body.max_tokens === 'number' && body.max_tokens > 0 ? body.max_tokens : MAX_TOKENS_CAP;
    const max_tokens = Math.min(clientTokens, MAX_TOKENS_CAP);

    // --- Atomic rate-limit claim via service role ---
    // The claim_ai_rate_limit_slot RPC uses an INSERT … ON CONFLICT … DO UPDATE WHERE <condition>
    // pattern so that only the first concurrent request in a 7-day window can claim the slot.
    // All subsequent parallel requests that arrive before the write completes will see 0 rows
    // updated and receive 429, closing the TOCTOU race that existed with the old read-then-write
    // fire-and-forget approach.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: slotClaimed, error: claimError } = await serviceClient.rpc(
      'claim_ai_rate_limit_slot',
      { p_user_id: user.id, p_window_ms: RATE_LIMIT_WINDOW_MS, p_max_uses: RATE_LIMIT_MAX_USES }
    );

    if (claimError) {
      console.error('[generate-reflection] Rate limit RPC error:', claimError.message);
      return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!slotClaimed) {
      const lastReflectionAt = userSettingsData['last_ai_reflection_at'] as string | undefined;
      const retryAfterSec = lastReflectionAt
        ? Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - new Date(lastReflectionAt).getTime())) / 1000)
        : RATE_LIMIT_WINDOW_MS / 1000;
      return new Response(
        JSON.stringify({
          error: `Rate limit: ${RATE_LIMIT_MAX_USES} AI reflections per 7 days`,
          retry_after_seconds: retryAfterSec,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSec),
          },
        }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens }),
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return new Response(JSON.stringify({ error: data.error?.message ?? 'OpenAI error' }), {
        status: openaiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
