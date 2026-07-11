-- Migration 00009: Align SMS quota limit across all layers
-- Problem: try_increment_sms_quota() used 10 as the free-tier limit,
--          but the client (app/request/new.tsx) and edge function (send-sms)
--          both enforce 5. This created a mismatch where:
--            - App UI shows "5 of 5 remaining" and blocks sends
--            - But direct Supabase SDK calls could still trigger up to 10 SMS
-- Fix: Set the DB constant to 5 (single source of truth, most restrictive layer wins).

CREATE OR REPLACE FUNCTION public.try_increment_sms_quota(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_pro          BOOLEAN;
  v_quota_used      INTEGER;
  v_quota_limit     CONSTANT INTEGER := 5;  -- FREE_SMS_LIMIT — matches client + edge function
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

-- Update column comments to reflect canonical limit of 5
COMMENT ON COLUMN public.profiles.sms_quota_used IS
  'Number of SMS review requests sent this billing period. Free tier limit: 5/month. Updated only via try_increment_sms_quota() SECURITY DEFINER function.';
COMMENT ON COLUMN public.profiles.sms_quota_reset_at IS
  'Timestamp when the SMS quota will reset (monthly). Managed only via try_increment_sms_quota(). Free tier: 5 SMS/month.';
