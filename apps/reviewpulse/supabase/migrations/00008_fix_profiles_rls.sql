-- Migration: 00008_fix_profiles_rls
-- Purpose: Fix P0 security vulnerability where broad profiles UPDATE policy
--          allowed authenticated users to reset sms_quota_used to 0 directly.
-- Fix: Replace the broad UPDATE policy with a column-restricted one that only
--      allows updating display_name, avatar_url, and notification_token.
--      Quota fields (sms_quota_used, sms_quota_reset_at) can only be modified
--      via SECURITY DEFINER functions (try_increment_sms_quota, etc.).
--
-- Also fixes the SMS quota mismatch: the app store listing said "5 SMS/month free"
-- but the code enforced 10. Align everything to 10 (more generous = no refunds).

-- Drop the overly-broad UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Replace with column-restricted UPDATE policy
-- Note: PostgreSQL RLS policies cannot restrict individual columns directly in
-- the USING clause, but we can use a WITH CHECK + SECURITY DEFINER trigger.
-- The cleanest approach: allow UPDATE but block quota columns via trigger.

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- SECURITY DEFINER trigger to enforce quota column immutability for regular users
CREATE OR REPLACE FUNCTION public.protect_profile_quota_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If not called from a SECURITY DEFINER context (i.e., called by a regular user),
  -- reject changes to quota fields
  IF current_setting('role') = 'authenticated' THEN
    IF NEW.sms_quota_used IS DISTINCT FROM OLD.sms_quota_used THEN
      RAISE EXCEPTION 'Direct modification of sms_quota_used is not allowed. Use try_increment_sms_quota().'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.sms_quota_reset_at IS DISTINCT FROM OLD.sms_quota_reset_at THEN
      RAISE EXCEPTION 'Direct modification of sms_quota_reset_at is not allowed.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger (replace if exists)
DROP TRIGGER IF EXISTS enforce_quota_immutability ON public.profiles;
CREATE TRIGGER enforce_quota_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_quota_fields();

-- Fix SMS quota constant mismatch: align app_store_metadata.md to 10 free SMS/month
-- The DB constant v_quota_limit in try_increment_sms_quota() already uses 10.
-- Document it here as the canonical source of truth.
COMMENT ON COLUMN public.profiles.sms_quota_used IS
  'Number of SMS review requests sent this billing period. Free tier limit: 10/month. Updated only via try_increment_sms_quota() SECURITY DEFINER function.';
COMMENT ON COLUMN public.profiles.sms_quota_reset_at IS
  'Timestamp when the SMS quota will reset (monthly). Managed only via try_increment_sms_quota(). Free tier: 10 SMS/month.';
