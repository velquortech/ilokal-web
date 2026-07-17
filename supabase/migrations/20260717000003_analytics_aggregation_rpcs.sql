-- Performance (P3): push analytics aggregation into SQL RPCs.
-- See .claude/PERFORMANCE_AUDIT.md (P3).
--
-- The analytics query layer fetched whole tables and reduced them in Node with
-- Map/Set. Two problems: PostgREST caps result sets at max_rows=1000 (config.toml)
-- so any business past 1000 redemptions/views returned SILENTLY WRONG numbers, and
-- it shipped large row sets + burned function CPU. These RPCs compute the
-- aggregate in Postgres and return only the finished rows.
--
-- Access: analytics runs through the service-role client
-- (createAnalyticsSupabaseClient) AFTER the route has verified business ownership.
-- So these are NOT exposed to anon/authenticated PostgREST — REVOKE from PUBLIC
-- and GRANT only to service_role. SECURITY DEFINER + pinned search_path for
-- consistency with the other analytics/definer functions.
--
-- Rollback: DROP FUNCTION public.analytics_coupon_redemption_stats(uuid, uuid);
--           DROP FUNCTION public.analytics_traffic_metrics(uuid, timestamptz);

-- Per-coupon redemption count + average days-to-redeem for a business, optionally
-- scoped to a branch. Backs getCouponStats and getCouponPerformance.
CREATE OR REPLACE FUNCTION public.analytics_coupon_redemption_stats(
  p_business_id UUID,
  p_branch_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  coupon_id          UUID,
  redeemed           BIGINT,
  avg_days_to_redeem NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    ur.coupon_id,
    count(*)::bigint AS redeemed,
    avg(
      EXTRACT(EPOCH FROM (ur.redeemed_at - c.start_date)) / 86400.0
    ) AS avg_days_to_redeem
  FROM public.user_redemptions ur
  JOIN public.coupons c ON c.id = ur.coupon_id
  WHERE c.business_id = p_business_id
    AND (p_branch_id IS NULL OR ur.branch_id = p_branch_id)
  GROUP BY ur.coupon_id;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_coupon_redemption_stats(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_coupon_redemption_stats(UUID, UUID)
  TO service_role;

-- Page views + unique visitors for a business since a cutoff. view_events is
-- already deduped to one row per user/business/day, so count(*) is page views and
-- count(DISTINCT user_id) is unique visitors. Replaces the fetch-all-then-Set path
-- in getTrafficMetrics (which also queried a non-existent `page_views` table).
CREATE OR REPLACE FUNCTION public.analytics_traffic_metrics(
  p_business_id UUID,
  p_since       TIMESTAMPTZ
)
RETURNS TABLE (
  page_views      BIGINT,
  unique_visitors BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    count(*)::bigint                    AS page_views,
    count(DISTINCT user_id)::bigint     AS unique_visitors
  FROM public.view_events
  WHERE business_id = p_business_id
    AND viewed_at >= p_since;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_traffic_metrics(UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_traffic_metrics(UUID, TIMESTAMPTZ)
  TO service_role;
