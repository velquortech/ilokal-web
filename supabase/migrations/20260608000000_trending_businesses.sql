-- Server-computed "Trending" flag for businesses.
--
-- WHY: the mobile Trending badge previously fired client-side on an absolute
-- `weekly_view_count >= 10`. That bar is so low that essentially every business
-- trips it — "Trending" stopped meaning anything (and the demo seed gives every
-- business 80–1600 views). Trending should be *relative* and *selective*.
--
-- DEFINITION: a business is trending when its weekly_view_count lands in the
-- TOP 20% (>= the 80th percentile) of all verified, non-archived businesses,
-- AND it has at least one view. The percentile is recomputed from live data, so
-- the bar self-adjusts as traffic grows — no magic number to maintain — and a
-- quiet catalog (everything at 0 views) marks nothing as trending.
--
-- The ranking is global (platform-wide "trending this week"), not relative to
-- the location-filtered result set, so the badge means the same thing on every
-- screen. The percentile subquery is uncorrelated, so it's evaluated once per
-- call, not per row.
--
-- The badge is purely automatic — there is no manual "mark as trending" toggle.
--
-- DROP first: adding a RETURNS TABLE column changes the OUT-param row type,
-- which CREATE OR REPLACE can't do.

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
  interior_images      TEXT[],
  average_rating       NUMERIC,
  rating_count         BIGINT,
  business_type        TEXT,
  category_name        TEXT,
  weekly_view_count    INTEGER,
  is_trending          BOOLEAN
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
    ) AS is_trending
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
    biz.id, biz.shop_name, biz.description, biz.logo_url, biz.interior_images,
    bt.name, bc.name, biz.weekly_view_count
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_businesses(FLOAT, FLOAT, INT) TO anon, authenticated;
