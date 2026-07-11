// eslint-disable-next-line import/no-unresolved
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * RevenueCat webhook handler.
 *
 * Required environment variables (set in Supabase Dashboard → Edge Functions → Secrets):
 *   REVENUECAT_WEBHOOK_SECRET  — the webhook authorization secret from RevenueCat dashboard
 *   SUPABASE_URL               — auto-injected by Supabase Edge Runtime
 *   SUPABASE_SERVICE_ROLE_KEY  — auto-injected by Supabase Edge Runtime
 *
 * RevenueCat webhook setup:
 *   Dashboard → Project → Integrations → Webhooks → Add endpoint
 *   URL: https://<project>.supabase.co/functions/v1/revenuecat-webhook
 *   Authorization header value: <REVENUECAT_WEBHOOK_SECRET>
 */

const ACTIVE_SUBSCRIPTION_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'BILLING_ISSUE_RESOLVED',
]);

const INACTIVE_SUBSCRIPTION_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  // SUBSCRIBER_ALIAS intentionally excluded: it fires when RevenueCat aliases an
  // anonymous ID to a known app user ID (e.g. after sign-in). It does NOT indicate
  // cancellation or expiry and must never trigger a premium→free downgrade.
]);

serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verify webhook secret
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[RevenueCat Webhook] REVENUECAT_WEBHOOK_SECRET env var not set');
    return new Response('Server misconfiguration', { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = payload['event'] as Record<string, unknown> | undefined;
  if (!event) {
    return new Response('Missing event', { status: 400 });
  }

  const eventType = event['type'] as string | undefined;
  const appUserId = event['app_user_id'] as string | undefined;

  if (!eventType || !appUserId) {
    return new Response('Missing event.type or event.app_user_id', { status: 400 });
  }

  // appUserId is the Supabase user UUID (set via Purchases.logIn(user.id) in the app)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let subscriptionTier: string;
  if (ACTIVE_SUBSCRIPTION_EVENTS.has(eventType)) {
    subscriptionTier = 'premium';
  } else if (INACTIVE_SUBSCRIPTION_EVENTS.has(eventType)) {
    subscriptionTier = 'free';
  } else {
    // Unrecognised event — no-op
    return new Response(JSON.stringify({ received: true, action: 'ignored', eventType }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Upsert subscription_tier into user_settings.settings JSONB column
  // user_settings row is created on first app load; upsert handles both create and update.
  const { error } = await supabase.rpc('upsert_subscription_tier', {
    p_user_id: appUserId,
    p_tier: subscriptionTier,
  });

  if (error) {
    // Fallback: fetch existing settings and merge to avoid clobbering other JSONB fields
    // (e.g. last_ai_reflection_at) that the RPC would have preserved atomically.
    const { data: existing } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', appUserId)
      .single();
    const existingSettings = (existing?.settings ?? {}) as Record<string, unknown>;

    const { error: directError } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: appUserId,
          settings: { ...existingSettings, subscription_tier: subscriptionTier },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );

    if (directError) {
      console.error('[RevenueCat Webhook] Failed to update subscription tier:', directError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription', details: directError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  console.log(`[RevenueCat Webhook] Set ${appUserId} → ${subscriptionTier} (event: ${eventType})`);
  return new Response(
    JSON.stringify({ received: true, userId: appUserId, tier: subscriptionTier }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
