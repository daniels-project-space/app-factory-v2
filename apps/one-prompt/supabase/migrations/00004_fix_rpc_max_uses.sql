-- Add p_max_uses parameter to claim_ai_rate_limit_slot so the edge function
-- can enforce 3 reflections per 7-day window instead of only 1.
-- Tracks usage count alongside last_ai_reflection_at in the JSONB settings blob.

CREATE OR REPLACE FUNCTION public.claim_ai_rate_limit_slot(
  p_user_id   UUID,
  p_window_ms BIGINT DEFAULT 604800000,  -- 7 days in ms
  p_max_uses  BIGINT DEFAULT 3           -- reflections allowed per window
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff  TIMESTAMPTZ;
  v_last_at TIMESTAMPTZ;
  v_count   BIGINT;
  v_row     public.user_settings%ROWTYPE;
BEGIN
  v_cutoff := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;

  -- Fetch current row (if any)
  SELECT * INTO v_row FROM public.user_settings WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- First ever interaction: insert and claim
    INSERT INTO public.user_settings (user_id, settings, updated_at)
    VALUES (
      p_user_id,
      jsonb_build_object(
        'last_ai_reflection_at', NOW()::text,
        'ai_reflection_count',   1
      ),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN TRUE;
  END IF;

  v_last_at := (v_row.settings->>'last_ai_reflection_at')::timestamptz;
  v_count   := COALESCE((v_row.settings->>'ai_reflection_count')::bigint, 0);

  IF v_last_at IS NULL OR v_last_at < v_cutoff THEN
    -- Window has expired: reset counter and claim slot
    UPDATE public.user_settings
    SET settings   = settings
                     || jsonb_build_object(
                          'last_ai_reflection_at', NOW()::text,
                          'ai_reflection_count',   1
                        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN TRUE;

  ELSIF v_count < p_max_uses THEN
    -- Still within window but under the cap: increment and claim
    UPDATE public.user_settings
    SET settings   = settings
                     || jsonb_build_object('ai_reflection_count', v_count + 1),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN TRUE;

  ELSE
    -- Window active and cap reached: reject
    RETURN FALSE;
  END IF;
END;
$$;

-- Update grants to cover the new 3-argument overload
REVOKE ALL ON FUNCTION public.claim_ai_rate_limit_slot(UUID, BIGINT, BIGINT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_ai_rate_limit_slot(UUID, BIGINT, BIGINT) TO service_role;
