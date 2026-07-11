-- ============================================================
-- ReviewPulse — Application Schema
-- Migration: 00002_reviewpulse_schema.sql
-- Depends on: 00001_base_schema.sql (profiles, push_tokens, user_settings)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pg_cron";   -- For scheduled review polling
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For encrypted token storage

-- ============================================================
-- BUSINESS PROFILES
-- Each user can connect multiple platforms (Google, Yelp, Trustpilot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('google', 'yelp', 'trustpilot', 'facebook')),
  business_name     TEXT NOT NULL,
  place_id          TEXT,                    -- Google Place ID for deep link generation
  platform_id       TEXT,                   -- Platform-specific business identifier
  review_link       TEXT,                   -- Pre-computed review request URL
  -- Stats cache (refreshed on each poll)
  current_rating    NUMERIC(3,2),
  total_reviews     INTEGER DEFAULT 0,
  last_polled_at    TIMESTAMP WITH TIME ZONE,
  -- OAuth tokens (AES-256 encrypted at application level before storage)
  access_token_enc  TEXT,                   -- Encrypted OAuth access token
  refresh_token_enc TEXT,                   -- Encrypted OAuth refresh token
  token_expires_at  TIMESTAMP WITH TIME ZONE,
  -- Metadata
  is_active         BOOLEAN DEFAULT TRUE,
  connected_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_id)
);

-- ============================================================
-- REVIEWS
-- All reviews across all connected platforms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  -- Platform identifiers
  platform            TEXT NOT NULL CHECK (platform IN ('google', 'yelp', 'trustpilot', 'facebook')),
  platform_review_id  TEXT NOT NULL,        -- Native platform review ID (for deduplication)
  -- Review content
  reviewer_name       TEXT,
  reviewer_avatar_url TEXT,
  rating              INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text         TEXT,
  review_url          TEXT,                 -- Link to review on platform
  -- Response tracking
  owner_reply         TEXT,                 -- The reply posted to the platform
  replied_at          TIMESTAMP WITH TIME ZONE,
  ai_draft            TEXT,                 -- AI-generated draft (Claude Haiku)
  ai_draft_generated_at TIMESTAMP WITH TIME ZONE,
  -- Status flags
  is_flagged          BOOLEAN DEFAULT FALSE, -- Flagged as suspicious/fake
  is_new              BOOLEAN DEFAULT TRUE,  -- Unread by user
  -- Platform-specific dates
  review_date         TIMESTAMP WITH TIME ZONE,
  -- System timestamps
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_profile_id, platform_review_id)
);

-- ============================================================
-- CUSTOMERS
-- Contact list for sending review requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,            -- E.164 format: +15551234567
  phone_country   TEXT DEFAULT 'US',        -- ISO 3166-1 alpha-2
  -- SMS opt-out tracking (TCPA compliance)
  opted_out       BOOLEAN DEFAULT FALSE,
  opted_out_at    TIMESTAMP WITH TIME ZONE,
  opted_out_reason TEXT,                    -- STOP, UNSTOP, user-removed, etc.
  -- Metadata
  notes           TEXT,                     -- Internal notes about the customer
  tags            TEXT[] DEFAULT '{}',      -- Custom tags for segmentation
  -- Tracking
  total_requests_sent INTEGER DEFAULT 0,
  last_request_at TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone)                    -- One customer record per phone per user
);

-- ============================================================
-- REVIEW REQUESTS
-- SMS review request history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.review_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  -- SMS details
  to_phone            TEXT NOT NULL,        -- E.164 phone number sent to
  to_name             TEXT,                 -- Recipient name (for template merge)
  message_body        TEXT NOT NULL,        -- Actual SMS content sent
  template_id         UUID,                 -- Which template was used (if any)
  review_link         TEXT,                 -- The review link included in message
  -- Twilio tracking
  twilio_sid          TEXT,                 -- Message SID from Twilio
  twilio_status       TEXT,                 -- queued | sent | delivered | failed | undelivered
  delivery_status     TEXT DEFAULT 'pending', -- pending | sent | delivered | failed
  error_code          TEXT,                 -- Twilio error code if failed
  error_message       TEXT,
  -- Outcome
  resulted_in_review  BOOLEAN,              -- Did this request lead to a review?
  linked_review_id    UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  -- Timestamps
  sent_at             TIMESTAMP WITH TIME ZONE,
  delivered_at        TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TEMPLATES
-- SMS message templates (system defaults + user custom)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                                            -- NULL = system template (shared)
  name        TEXT NOT NULL,
  body        TEXT NOT NULL,               -- Template body with merge tags
                                            -- Available merge tags: {{name}}, {{business}}, {{link}}
  industry    TEXT,                        -- For system templates: 'general' | 'trades' | 'beauty' | 'health' | 'auto' | 'food'
  is_default  BOOLEAN DEFAULT FALSE,       -- User's default template
  is_system   BOOLEAN DEFAULT FALSE,       -- System-provided template (non-deletable)
  use_count   INTEGER DEFAULT 0,           -- Track which templates get used most
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SYSTEM DEFAULT TEMPLATES (inserted on migration)
-- ============================================================
INSERT INTO public.templates (id, name, body, industry, is_system) VALUES
  (gen_random_uuid(), 'General', 'Hi {{name}}! Thanks so much for choosing {{business}}. Would you mind leaving us a quick Google review? It means a lot: {{link}}', 'general', TRUE),
  (gen_random_uuid(), 'Trades (After Job)', 'Hi {{name}}, it was great working for you! If you were happy with the service, a Google review would really help us out: {{link}} Takes less than a minute!', 'trades', TRUE),
  (gen_random_uuid(), 'Beauty (After Appointment)', 'Hey {{name}}! Hope you''re loving your new look! If you have a moment, a quick Google review would mean so much to us: {{link}}', 'beauty', TRUE),
  (gen_random_uuid(), 'Health & Wellness', 'Hi {{name}}, thank you for visiting {{business}}. We''d love to hear about your experience! {{link}}', 'health', TRUE),
  (gen_random_uuid(), 'Automotive (After Service)', 'Hi {{name}}, hope your vehicle is running great! We''d really appreciate a quick Google review: {{link}} Thank you!', 'auto', TRUE),
  (gen_random_uuid(), 'Food & Beverage', 'Hi {{name}}! Thanks for visiting {{business}} — hope you enjoyed everything! A quick review would help us loads: {{link}}', 'food', TRUE);

-- ============================================================
-- USER SUBSCRIPTIONS / SMS QUOTAS
-- Extend the base profiles table
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name      TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier  TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS revenuecat_id      TEXT,
  ADD COLUMN IF NOT EXISTS sms_quota_used     INTEGER DEFAULT 0,     -- Current month usage
  ADD COLUMN IF NOT EXISTS sms_quota_reset_at TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- ============================================================
-- ANALYTICS MATERIALIZED VIEW
-- Pre-computed for fast dashboard loading
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_summary AS
SELECT
  r.user_id,
  r.business_profile_id,
  r.platform,
  COUNT(*)::INTEGER                               AS total_reviews,
  ROUND(AVG(r.rating)::NUMERIC, 2)               AS avg_rating,
  COUNT(*) FILTER (WHERE r.rating = 5)::INTEGER   AS five_star,
  COUNT(*) FILTER (WHERE r.rating = 4)::INTEGER   AS four_star,
  COUNT(*) FILTER (WHERE r.rating = 3)::INTEGER   AS three_star,
  COUNT(*) FILTER (WHERE r.rating = 2)::INTEGER   AS two_star,
  COUNT(*) FILTER (WHERE r.rating = 1)::INTEGER   AS one_star,
  COUNT(*) FILTER (WHERE r.owner_reply IS NOT NULL)::INTEGER AS replied_count,
  ROUND(
    COUNT(*) FILTER (WHERE r.owner_reply IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    1
  )                                               AS response_rate_pct,
  -- This month
  COUNT(*) FILTER (WHERE r.review_date >= DATE_TRUNC('month', NOW()))::INTEGER AS reviews_this_month,
  -- Last month (for trend)
  COUNT(*) FILTER (WHERE r.review_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                     AND r.review_date < DATE_TRUNC('month', NOW()))::INTEGER  AS reviews_last_month,
  MAX(r.review_date)                             AS latest_review_at,
  NOW()                                          AS computed_at
FROM public.reviews r
GROUP BY r.user_id, r.business_profile_id, r.platform
WITH DATA;

-- Unique index for fast lookup and refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_summary_unique
  ON public.analytics_summary(user_id, business_profile_id, platform);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reviews_user_id          ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id      ON public.reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform         ON public.reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_is_new           ON public.reviews(is_new) WHERE is_new = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_date             ON public.reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating           ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_review_requests_user_id  ON public.review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON public.review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status   ON public.review_requests(delivery_status);
CREATE INDEX IF NOT EXISTS idx_customers_user_id        ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone          ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_opted_out      ON public.customers(opted_out) WHERE opted_out = FALSE;
CREATE INDEX IF NOT EXISTS idx_business_profiles_user   ON public.business_profiles(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- business_profiles: users see only their own
CREATE POLICY "business_profiles_own" ON public.business_profiles
  FOR ALL USING (auth.uid() = user_id);

-- reviews: users see only their own
CREATE POLICY "reviews_own" ON public.reviews
  FOR ALL USING (auth.uid() = user_id);

-- customers: users see only their own
CREATE POLICY "customers_own" ON public.customers
  FOR ALL USING (auth.uid() = user_id);

-- review_requests: users see only their own
CREATE POLICY "review_requests_own" ON public.review_requests
  FOR ALL USING (auth.uid() = user_id);

-- templates: users see system templates (user_id IS NULL) + their own
CREATE POLICY "templates_own_and_system" ON public.templates
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "templates_own_insert" ON public.templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "templates_own_update" ON public.templates
  FOR UPDATE USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "templates_own_delete" ON public.templates
  FOR DELETE USING (auth.uid() = user_id AND is_system = FALSE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_review_requests_updated_at
  BEFORE UPDATE ON public.review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment customer request count when a request is sent
CREATE OR REPLACE FUNCTION increment_customer_request_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.sent_at IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_requests_sent = total_requests_sent + 1,
      last_request_at     = NEW.sent_at
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_customer_request
  AFTER INSERT ON public.review_requests
  FOR EACH ROW EXECUTE FUNCTION increment_customer_request_count();

-- Refresh analytics_summary when reviews change
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.analytics_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_analytics_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_analytics_summary();

-- ============================================================
-- pg_cron JOB: Poll GBP for new reviews every 15 minutes
-- (Uncomment and configure after enabling pg_cron extension)
-- ============================================================
-- SELECT cron.schedule(
--   'poll-reviews-every-15min',
--   '*/15 * * * *',
--   $$SELECT net.http_post(
--     url := 'https://lsxktelhxiudcjbwoisq.supabase.co/functions/v1/poll-reviews',
--     headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT SELECT ON public.analytics_summary TO authenticated;

-- Service role needs full access for Edge Functions
GRANT ALL ON public.business_profiles TO service_role;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.review_requests TO service_role;
GRANT ALL ON public.templates TO service_role;
GRANT ALL ON public.analytics_summary TO service_role;
