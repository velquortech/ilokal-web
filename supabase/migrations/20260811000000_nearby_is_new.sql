-- Expose an `is_new` flag through nearby_businesses so the mobile Home
-- Spotlight can badge businesses listed recently (the "NEW" hero tier).
--
-- WHY: the spotlight hero's tiers are config-driven on the client
-- (constants/home/spotlight.ts), but every tier needs a real signal from the
-- API. `is_featured`/`is_trending` already come from this RPC; recency is the
-- missing one. "New" here means listed (row created) within the last 7 days
-- and verified — a shop that signs up today is new, a shop listed two months
-- ago is not, regardless of activity. The window is deliberately short so the
-- tier stays scarce (a tier that matches everything reads as noise — the same
-- reason the client drops the badge on its generic fallback). Originally 14
-- days, tightened to 7: in the beta seed nearly every business was created
-- recently, so 14 days badged the whole hero. 7 keeps the tier scarce.
--
-- DROP first: adding a RETURNS TABLE column changes the OUT-param row type,
-- which CREATE OR REPLACE can't do (same pattern as 20260614000000 and
-- 20260808090000).

DROP FUNCTION IF EXISTS public.nearby_businesses(FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION public.nearby_businesses(
  lat            FLOAT,
  lng            FLOAT,
  radius_meters  INT DEFAULT 5000
)
RETURNS TABLE (
  branch_id            UUID,
  branch_name          TEXT,
  address              TEXT,
  branch_lat           FLOAT,
  branch_lng           FLOAT,
  distance_meters      FLOAT,
  business_id          UUID,
  business_name        TEXT,
  business_description TEXT,
  logo_url             TEXT,
  banner_url           TEXT,
  interior_images      TEXT[],
  average_rating       NUMERIC,
  rating_count         BIGINT,
  business_type        TEXT,
  category_name        TEXT,
  weekly_view_count    INTEGER,
  is_trending          BOOLEAN,
  is_featured          BOOLEAN,
  is_new               BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
  SELECT
    b.id              AS branch_id,
    b.name            AS branch_name,
    b.address,
    ST_Y(b.location::geometry) AS branch_lat,
    ST_X(b.location::geometry) AS branch_lng,
    ST_Distance(b.location, ST_MakePoint(lng, lat)::geography) AS distance_meters,
    biz.id            AS business_id,
    biz.shop_name     AS business_name,
    biz.description   AS business_description,
    biz.logo_url,
    biz.banner_url,
    biz.interior_images,
    COALESCE(ROUND(AVG(br.rating)::numeric, 1), 0) AS average_rating,
    COALESCE(COUNT(br.id), 0)                       AS rating_count,
    bt.name           AS business_type,
    bc.name           AS category_name,
    biz.weekly_view_count,
    (
      biz.weekly_view_count > 0
      AND biz.weekly_view_count >= (
        -- 80th percentile of weekly views across all verified businesses.
        SELECT percentile_cont(0.8) WITHIN GROUP (ORDER BY weekly_view_count)
        FROM public.businesses
        WHERE status = 'verified' AND archived_at IS NULL
      )
    ) AS is_trending,
    EXISTS (
      -- Active, in-period subscription on a promo-boost plan = paid placement.
      SELECT 1
      FROM public.business_subscriptions bs
      JOIN public.subscription_plans sp ON sp.id = bs.plan_id
      WHERE bs.business_id = biz.id
        AND bs.status = 'active'
        AND bs.current_period_end > NOW()
        AND sp.features_promo_boost = TRUE
    ) AS is_featured,
    -- Listed within the last 7 days (verified rows are already filtered
    -- above). Kept as its own GROUP BY column alongside weekly_view_count,
    -- following the function's existing style.
    (biz.created_at > NOW() - INTERVAL '7 days') AS is_new
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  LEFT JOIN public.business_ratings br ON br.business_id = biz.id
  WHERE
    biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND b.location IS NOT NULL
    AND (
      radius_meters <= 0
      OR ST_DWithin(
           b.location,
           ST_MakePoint(lng, lat)::geography,
           LEAST(radius_meters, 100000)
         )
    )
  GROUP BY
    b.id, b.name, b.address, b.location,
    biz.id, biz.shop_name, biz.description, biz.logo_url, biz.banner_url,
    biz.interior_images,
    bt.name, bc.name, biz.weekly_view_count, biz.created_at
  -- Featured (promoted) businesses first, then by proximity. Mobile filters by
  -- is_featured then slices, so this keeps the nearest promoted shops on top.
  ORDER BY is_featured DESC, distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_businesses(FLOAT, FLOAT, INT) TO anon, authenticated;
