-- ============================================================
-- Migration 00007: Security hardening
-- Fixes:
--   1. analytics_summary missing RLS (any authed user reads all data)
--   2. SMS quota check-then-update race condition (concurrent bypass)
--   3. poll-reviews pg_cron job (core monitoring feature was disabled)
-- ============================================================

-- ── 1. analytics_summary: secure access via filtered wrapper view ─
-- Materialized views cannot have RLS enabled in PostgreSQL.
-- Fix: revoke direct authenticated access; create a regular view
-- analytics_user_summary that filters to auth.uid() — this view
-- is what the app should query. The mat view remains for cron refresh.

REVOKE SELECT ON public.analytics_summary FROM authenticated;

CREATE OR REPLACE VIEW public.analytics_user_summary AS
  SELECT * FROM public.analytics_summary
  WHERE user_id = auth.uid();

-- Grant the filtered view to authenticated users
GRANT SELECT ON public.analytics_user_summary TO authenticated;
-- Service role retains direct access to analytics_summary for refresh
GRANT SELECT ON public.analytics_summary TO service_role;


-- ── 2. Atomic SMS quota check-and-increment ────────────────────
-- Replaces the non-atomic read → check → increment in send-sms.
-- Returns: { allowed: bool, quota_used: int, quota_limit: int|null, is_pro: bool }
CREATE OR REPLACE FUNCTION public.try_increment_sms_quota(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_pro          BOOLEAN;
  v_quota_used      INTEGER;
  v_quota_limit     CONSTANT INTEGER := 10;  -- FREE_SMS_LIMIT
  v_reset_at        TIMESTAMPTZ;
  v_now             TIMESTAMPTZ := NOW();
  v_new_count       INTEGER;
BEGIN
  -- Lock the row to prevent concurrent increments
  SELECT is_pro, sms_quota_used, sms_quota_reset_at
    INTO v_is_pro, v_quota_used, v_reset_at
    FROM public.profiles
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'error', 'profile_not_found');
  END IF;

  -- Monthly reset: if reset date is from a prior month, zero the counter
  IF EXTRACT(YEAR FROM v_reset_at) <> EXTRACT(YEAR FROM v_now)
     OR EXTRACT(MONTH FROM v_reset_at) <> EXTRACT(MONTH FROM v_now) THEN
    v_quota_used := 0;
    UPDATE public.profiles
       SET sms_quota_used    = 0,
           sms_quota_reset_at = DATE_TRUNC('month', v_now)
     WHERE id = p_user_id;
  END IF;

  -- Enforce free-tier quota
  IF NOT v_is_pro AND v_quota_used >= v_quota_limit THEN
    RETURN json_build_object(
      'allowed',      false,
      'quota_used',   v_quota_used,
      'quota_limit',  v_quota_limit,
      'is_pro',       false
    );
  END IF;

  -- Increment atomically
  v_new_count := v_quota_used + 1;
  UPDATE public.profiles
     SET sms_quota_used = v_new_count
   WHERE id = p_user_id;

  RETURN json_build_object(
    'allowed',      true,
    'quota_used',   v_new_count,
    'quota_limit',  CASE WHEN v_is_pro THEN NULL ELSE v_quota_limit END,
    'is_pro',       v_is_pro
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_increment_sms_quota(UUID) TO service_role;
-- Note: called from edge function with service-role client, not direct user RPC


-- ── 3. poll-reviews pg_cron job ───────────────────────────────
-- Enable the review polling cron job.
-- Uses pg_net to call the poll-reviews edge function every 15 minutes.
-- Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set as GUC settings,
-- or update the URL/key below after deployment.
--
-- To activate: run this manually or set app.supabase_url + app.service_role_key:
--   ALTER DATABASE app_reviewpulse SET app.supabase_url = 'https://...';
--   ALTER DATABASE app_reviewpulse SET app.service_role_key = 'eyJ...';
--
-- The cron job is registered but will use placeholder values until configured.
-- pg_cron job registration (only runs if pg_cron extension is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('poll-reviews-every-15min')
      FROM cron.job WHERE jobname = 'poll-reviews-every-15min';

    PERFORM cron.schedule(
      'poll-reviews-every-15min',
      '*/15 * * * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url', true) || '/functions/v1/poll-reviews',
          headers := json_build_object(
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
            'Content-Type',  'application/json'
          )::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'poll-reviews cron job registered';
  ELSE
    RAISE NOTICE 'pg_cron not installed — run: CREATE EXTENSION pg_cron; then re-run this migration';
  END IF;
END;
$$;
