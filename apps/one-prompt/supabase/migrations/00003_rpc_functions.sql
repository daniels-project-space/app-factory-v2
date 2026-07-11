-- Atomically claim an AI rate-limit slot for a user.
--
-- Uses INSERT … ON CONFLICT … DO UPDATE WHERE <condition> so that only the
-- FIRST request within a 7-day window succeeds.  Parallel requests that arrive
-- before the winning write commits will see 0 rows affected and must 429.
-- Called by the generate-reflection edge function using the service role.
--
-- Returns TRUE  if the slot was claimed (caller may proceed to OpenAI).
-- Returns FALSE if the user is still within their 7-day window (rate-limit).
CREATE OR REPLACE FUNCTION public.claim_ai_rate_limit_slot(
  p_user_id  UUID,
  p_window_ms BIGINT DEFAULT 604800000   -- 7 days in milliseconds
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claimed INTEGER;
  v_cutoff  TIMESTAMPTZ;
BEGIN
  v_cutoff := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;

  INSERT INTO public.user_settings (user_id, settings, updated_at)
  VALUES (
    p_user_id,
    jsonb_build_object('last_ai_reflection_at', NOW()::text),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET settings   = public.user_settings.settings
                     || jsonb_build_object('last_ai_reflection_at', NOW()::text),
        updated_at = NOW()
    WHERE (
      public.user_settings.settings->>'last_ai_reflection_at' IS NULL
      OR (public.user_settings.settings->>'last_ai_reflection_at')::timestamptz < v_cutoff
    );

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed > 0;
END;
$$;

-- Only the service role (edge functions) may call this function.
REVOKE ALL ON FUNCTION public.claim_ai_rate_limit_slot(UUID, BIGINT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_ai_rate_limit_slot(UUID, BIGINT) TO service_role;


-- Safely merge subscription_tier into user_settings.settings without clobbering
-- other fields (e.g. last_ai_reflection_at).  Called by the revenuecat-webhook
-- edge function using the service role.
CREATE OR REPLACE FUNCTION public.upsert_subscription_tier(
  p_user_id UUID,
  p_tier    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, settings, updated_at)
  VALUES (
    p_user_id,
    jsonb_build_object('subscription_tier', p_tier),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET settings   = public.user_settings.settings
                     || jsonb_build_object('subscription_tier', p_tier),
        updated_at = NOW();
END;
$$;

-- Only the service role may call this function.
REVOKE ALL ON FUNCTION public.upsert_subscription_tier(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upsert_subscription_tier(UUID, TEXT) TO service_role;
