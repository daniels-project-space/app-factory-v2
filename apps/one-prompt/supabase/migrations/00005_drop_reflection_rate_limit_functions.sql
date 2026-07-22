-- Weekly reflections are generated locally. Remove both historical overloads
-- from already-migrated projects as they no longer have a caller.
DROP FUNCTION IF EXISTS public.claim_ai_rate_limit_slot(UUID, BIGINT);
DROP FUNCTION IF EXISTS public.claim_ai_rate_limit_slot(UUID, BIGINT, BIGINT);
