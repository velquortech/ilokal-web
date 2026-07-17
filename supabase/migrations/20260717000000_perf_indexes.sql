-- Performance: add missing indexes on hot filter/FK columns.
-- Postgres does NOT auto-index foreign keys; the analytics layer full-scans
-- payments / page_views / business_ratings / user_redemptions on every call.
-- See .claude/PERFORMANCE_AUDIT.md (P2–P5).
--
-- NOTE: plain CREATE INDEX (not CONCURRENTLY) — Supabase runs each migration in
-- a transaction, and CONCURRENTLY cannot run inside one. These tables are small
-- enough that the brief lock is acceptable. For a large busy prod table, apply
-- the equivalent CONCURRENTLY statement manually outside a migration instead.
-- Rollback: DROP INDEX for each idx_* below (non-breaking, no data change).

-- payments: analytics filters business_id + status(+ created_at range)
CREATE INDEX IF NOT EXISTS idx_payments_business_status_created
  ON public.payments (business_id, status, created_at DESC);

-- (Traffic metrics query a non-existent `page_views` table — see P8/SEC note in
--  the audit. The real table is `view_events`, already indexed on
--  (business_id, viewed_at). No new index needed once getTrafficMetrics is fixed.)

-- user_redemptions: every analytics fn filters .in('coupon_id', ...) (FK, unindexed)
CREATE INDEX IF NOT EXISTS idx_user_redemptions_coupon_redeemed
  ON public.user_redemptions (coupon_id, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_user_redemptions_branch
  ON public.user_redemptions (branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_redemptions_user
  ON public.user_redemptions (user_id);

-- business_ratings: health indicators filter business_id
CREATE INDEX IF NOT EXISTS idx_business_ratings_business
  ON public.business_ratings (business_id);
