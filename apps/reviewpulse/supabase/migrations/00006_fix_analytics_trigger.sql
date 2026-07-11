-- ============================================================
-- Fix analytics_summary refresh: drop sync trigger, use pg_cron
-- Migration: 00006_fix_analytics_trigger.sql
-- Reason: synchronous REFRESH MATERIALIZED VIEW CONCURRENTLY on every
--         review INSERT/UPDATE/DELETE makes writes unboundedly slow at scale.
--         Replace with a pg_cron job that refreshes every 5 minutes.
-- ============================================================

-- Drop the per-row sync trigger and its function
DROP TRIGGER IF EXISTS trg_refresh_analytics_on_review ON public.reviews;
DROP FUNCTION IF EXISTS public.refresh_analytics_summary();

-- Schedule analytics_summary refresh every 5 minutes via pg_cron
SELECT cron.schedule(
  'refresh-analytics-summary-5min',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.analytics_summary$$
);
