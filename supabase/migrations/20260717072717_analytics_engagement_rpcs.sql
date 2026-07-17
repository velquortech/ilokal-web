-- Performance (P3, remaining): push the engagement/RFM analytics aggregation
-- into SQL RPCs. See .claude/PERFORMANCE_AUDIT.md (P3 / Phase 3, item 3).
--
-- getRetentionData / getMonthlyTrend / getFollowerFunnel / getCustomerSegments
-- and the ratings read in getBusinessHealthIndicators all fetched whole tables
-- (user_redemptions, follows, business_ratings) and reduced them in Node with
-- Map/Set. PostgREST caps result sets at max_rows=1000 (config.toml), so any
-- business past 1000 redemptions/follows/ratings returned SILENTLY WRONG
-- numbers, besides shipping large row sets. These RPCs return finished
-- aggregates only.
--
-- Semantics mirror the JS where it matters:
--   * "months" are the 6 calendar months ending in the current one (oldest
--     first). The JS bucketed by server-local time; SQL uses the DB timezone
--     (UTC on Supabase) — same tradeoff the existing revenue window makes.
--   * Coupons are scoped business_id + archived_at IS NULL (getBusinessCouponIds).
--   * Retention "new" = redeemed this month, not the previous month;
--     "returning" = redeemed both; "churned" = previous month only. The oldest
--     window month has no previous month inside the window, so everyone there
--     counts as new (matches the JS empty prevSet).
--   * Segments cascade exactly like the JS if/else chain (CASE short-circuits).
--
-- Access: analytics runs through the service-role client AFTER the route has
-- verified business ownership, so REVOKE from PUBLIC/anon/authenticated and
-- GRANT only to service_role (same as 20260717000003).
--
-- Rollback:
--   DROP FUNCTION public.analytics_retention_months(uuid, uuid);
--   DROP FUNCTION public.analytics_monthly_trend(uuid, uuid);
--   DROP FUNCTION public.analytics_follower_funnel(uuid, uuid);
--   DROP FUNCTION public.analytics_customer_segments(uuid, uuid);
--   DROP FUNCTION public.analytics_rating_summary(uuid);

-- New / returning / churned customers per month over the trailing 6 calendar
-- months. Backs getRetentionData (and, through it, getBusinessHealthIndicators).
CREATE OR REPLACE FUNCTION public.analytics_retention_months(
  p_business_id UUID,
  p_branch_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  month_start         DATE,
  new_customers       BIGINT,
  returning_customers BIGINT,
  churned_customers   BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH months AS (
    SELECT (date_trunc('month', now()) - make_interval(months => g))::date AS month_start
    FROM generate_series(5, 0, -1) AS g
  ),
  red AS (
    SELECT DISTINCT
      ur.user_id,
      date_trunc('month', ur.redeemed_at)::date AS month_start
    FROM public.user_redemptions ur
    JOIN public.coupons c ON c.id = ur.coupon_id
    WHERE c.business_id = p_business_id
      AND c.archived_at IS NULL
      AND (p_branch_id IS NULL OR ur.branch_id = p_branch_id)
      AND ur.redeemed_at >= date_trunc('month', now()) - interval '5 months'
  )
  SELECT
    m.month_start,
    count(cur.user_id) FILTER (WHERE prev.user_id IS NULL)     AS new_customers,
    count(cur.user_id) FILTER (WHERE prev.user_id IS NOT NULL) AS returning_customers,
    (
      SELECT count(*)
      FROM red p
      WHERE p.month_start = (m.month_start - interval '1 month')::date
        AND NOT EXISTS (
          SELECT 1 FROM red c2
          WHERE c2.user_id = p.user_id AND c2.month_start = m.month_start
        )
    ) AS churned_customers
  FROM months m
  LEFT JOIN red cur ON cur.month_start = m.month_start
  LEFT JOIN red prev
    ON prev.user_id = cur.user_id
   AND prev.month_start = (m.month_start - interval '1 month')::date
  GROUP BY m.month_start
  ORDER BY m.month_start;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_retention_months(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_retention_months(UUID, UUID)
  TO service_role;

-- New followers + redemptions per month over the trailing 6 calendar months.
-- Backs getMonthlyTrend. Followers are business-wide (the JS never
-- branch-scoped the follows read); redemptions honor p_branch_id.
CREATE OR REPLACE FUNCTION public.analytics_monthly_trend(
  p_business_id UUID,
  p_branch_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  month_start DATE,
  followers   BIGINT,
  redemptions BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH months AS (
    SELECT (date_trunc('month', now()) - make_interval(months => g))::date AS month_start
    FROM generate_series(5, 0, -1) AS g
  )
  SELECT
    m.month_start,
    (
      SELECT count(*)
      FROM public.follows f
      WHERE f.business_id = p_business_id
        AND date_trunc('month', f.created_at)::date = m.month_start
    ) AS followers,
    (
      SELECT count(*)
      FROM public.user_redemptions ur
      JOIN public.coupons c ON c.id = ur.coupon_id
      WHERE c.business_id = p_business_id
        AND c.archived_at IS NULL
        AND (p_branch_id IS NULL OR ur.branch_id = p_branch_id)
        AND date_trunc('month', ur.redeemed_at)::date = m.month_start
    ) AS redemptions
  FROM months m
  ORDER BY m.month_start;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_monthly_trend(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_monthly_trend(UUID, UUID)
  TO service_role;

-- Follower conversion funnel: total followers → ever redeemed → active in the
-- last 30 days → loyal (redeemed in >= 2 distinct calendar months, all time).
-- Backs getFollowerFunnel. total_followers is business-wide (JS parity).
CREATE OR REPLACE FUNCTION public.analytics_follower_funnel(
  p_business_id UUID,
  p_branch_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  total_followers BIGINT,
  ever_redeemed   BIGINT,
  active_30d      BIGINT,
  loyal           BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH red AS (
    SELECT ur.user_id, ur.redeemed_at
    FROM public.user_redemptions ur
    JOIN public.coupons c ON c.id = ur.coupon_id
    WHERE c.business_id = p_business_id
      AND c.archived_at IS NULL
      AND (p_branch_id IS NULL OR ur.branch_id = p_branch_id)
  )
  SELECT
    (SELECT count(*) FROM public.follows f
      WHERE f.business_id = p_business_id)::bigint             AS total_followers,
    (SELECT count(DISTINCT user_id) FROM red)::bigint          AS ever_redeemed,
    (SELECT count(DISTINCT user_id) FROM red
      WHERE redeemed_at >= now() - interval '30 days')::bigint AS active_30d,
    (SELECT count(*) FROM (
        SELECT user_id
        FROM red
        GROUP BY user_id
        HAVING count(DISTINCT date_trunc('month', redeemed_at)) >= 2
      ) l)::bigint                                             AS loyal;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_follower_funnel(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_follower_funnel(UUID, UUID)
  TO service_role;

-- RFM-style segment counts per user (frequency = redemption count, recency =
-- days since last redemption). Backs getCustomerSegments. The CASE cascades in
-- the same order as the JS if/else chain.
CREATE OR REPLACE FUNCTION public.analytics_customer_segments(
  p_business_id UUID,
  p_branch_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  champion     BIGINT,
  loyal        BIGINT,
  at_risk      BIGINT,
  lost         BIGINT,
  new_customer BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH per_user AS (
    SELECT
      ur.user_id,
      count(*) AS cnt,
      EXTRACT(EPOCH FROM (now() - max(ur.redeemed_at))) / 86400.0 AS days_since
    FROM public.user_redemptions ur
    JOIN public.coupons c ON c.id = ur.coupon_id
    WHERE c.business_id = p_business_id
      AND c.archived_at IS NULL
      AND (p_branch_id IS NULL OR ur.branch_id = p_branch_id)
    GROUP BY ur.user_id
  ),
  seg AS (
    SELECT CASE
      WHEN cnt >= 4 AND days_since <= 30 THEN 'champion'
      WHEN cnt >= 2 AND days_since <= 60 THEN 'loyal'
      WHEN cnt = 1 AND days_since <= 14 THEN 'new_customer'
      WHEN days_since <= 90 THEN 'at_risk'
      ELSE 'lost'
    END AS segment
    FROM per_user
  )
  SELECT
    count(*) FILTER (WHERE segment = 'champion')     AS champion,
    count(*) FILTER (WHERE segment = 'loyal')        AS loyal,
    count(*) FILTER (WHERE segment = 'at_risk')      AS at_risk,
    count(*) FILTER (WHERE segment = 'lost')         AS lost,
    count(*) FILTER (WHERE segment = 'new_customer') AS new_customer
  FROM seg;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_customer_segments(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_customer_segments(UUID, UUID)
  TO service_role;

-- Rating summary for the health indicators: overall average + this-month /
-- last-month averages for the trend arrow. Replaces the fetch-every-rating
-- read in getBusinessHealthIndicators.
CREATE OR REPLACE FUNCTION public.analytics_rating_summary(
  p_business_id UUID
)
RETURNS TABLE (
  avg_rating       NUMERIC,
  ratings_count    BIGINT,
  this_month_avg   NUMERIC,
  this_month_count BIGINT,
  last_month_avg   NUMERIC,
  last_month_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    avg(rating)      AS avg_rating,
    count(*)::bigint AS ratings_count,
    avg(rating) FILTER (
      WHERE date_trunc('month', created_at) = date_trunc('month', now())
    ) AS this_month_avg,
    count(*) FILTER (
      WHERE date_trunc('month', created_at) = date_trunc('month', now())
    )::bigint AS this_month_count,
    avg(rating) FILTER (
      WHERE date_trunc('month', created_at)
            = date_trunc('month', now()) - interval '1 month'
    ) AS last_month_avg,
    count(*) FILTER (
      WHERE date_trunc('month', created_at)
            = date_trunc('month', now()) - interval '1 month'
    )::bigint AS last_month_count
  FROM public.business_ratings
  WHERE business_id = p_business_id;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_rating_summary(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_rating_summary(UUID)
  TO service_role;
