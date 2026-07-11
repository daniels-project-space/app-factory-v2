// ReviewPulse — RevenueCat Webhook Handler
// Receives subscription lifecycle events from RevenueCat
// Updates profiles.is_pro in Supabase to sync subscription status
// Events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// RevenueCat event types that grant/revoke Pro access
const GRANT_EVENTS = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE', // Upgrade/downgrade — still active
];

const REVOKE_EVENTS = [
  'EXPIRATION',
  'BILLING_ISSUE', // Grace period ended
];

// CANCELLATION means auto-renew is off, but subscription is still active until period ends
// We do NOT revoke Pro on CANCELLATION — only on EXPIRATION

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    entitlement_ids?: string[];
    product_id?: string;
    expiration_at_ms?: number;
    purchased_at_ms?: number;
    period_type?: string;
    environment?: string;
    store?: string;
  };
  api_version: string;
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook authorization header — fail closed if secret not configured
  if (!webhookSecret) {
    console.error('REVENUECAT_WEBHOOK_SECRET not configured — rejecting request');
    return new Response('Service unavailable', { status: 503 });
  }
  const rcAuthHeader = req.headers.get('authorization') || '';
  if (rcAuthHeader !== `Bearer ${webhookSecret}`) {
    console.error('Invalid webhook secret');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body: RevenueCatEvent = await req.json();
    const event = body.event;

    console.log(`RevenueCat event: ${event.type} for user ${event.app_user_id}`);

    // Skip sandbox events in production (optional — log them)
    if (event.environment === 'SANDBOX') {
      console.log('Sandbox event — processing anyway for dev');
    }

    const userId = event.app_user_id;
    if (!userId || userId.startsWith('$RCAnonymous')) {
      // Anonymous user — can't update profile
      console.log('Skipping anonymous user event');
      return new Response(JSON.stringify({ ok: true, skipped: 'anonymous' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine if this event grants or revokes Pro
    const isPro = GRANT_EVENTS.includes(event.type);
    const shouldRevoke = REVOKE_EVENTS.includes(event.type);

    if (isPro || shouldRevoke) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_pro: isPro,
          subscription_tier: isPro ? 'pro' : 'free',
        })
        .eq('id', userId);

      if (error) {
        console.error(`Failed to update profile: ${error.message}`);
        // Return 500 so RevenueCat retries the webhook and syncs subscription status
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      console.log(`Updated user ${userId}: is_pro=${isPro}`);
    } else {
      console.log(`Event ${event.type} does not change Pro status — logged only`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event_type: event.type,
        user_id: userId,
        is_pro: isPro,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      {
        status: 200, // 200 to prevent RevenueCat retries
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
