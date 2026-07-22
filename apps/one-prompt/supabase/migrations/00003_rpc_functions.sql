-- Safely merge subscription_tier into user_settings.settings without clobbering
-- other settings. Called by the revenuecat-webhook edge function using the
-- service role.
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

REVOKE ALL ON FUNCTION public.upsert_subscription_tier(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_tier(UUID, TEXT) TO service_role;
