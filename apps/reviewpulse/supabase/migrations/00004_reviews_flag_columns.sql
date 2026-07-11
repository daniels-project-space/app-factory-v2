-- Migration 00004: Add flag_reason and flagged_at columns to reviews table
-- Required by app/reviews/[id].tsx handleFlag() which writes these fields
-- when a user flags a suspicious or inappropriate review for Google's attention

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS flag_reason  TEXT,
  ADD COLUMN IF NOT EXISTS flagged_at   TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_reviews_is_flagged ON public.reviews(is_flagged) WHERE is_flagged = TRUE;
