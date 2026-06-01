-- Expose branch coordinates to the mobile API so the app can plot a map pin and
-- offer "Get Directions". branches.location is GEOGRAPHY POINT(lng lat); we decode
-- it with ST_X / ST_Y (cast to geometry) into plain lng / lat floats.

-- 1) nearby_businesses: re-add with branch_lat / branch_lng appended.
--    RETURNS TABLE shape changes, so DROP + CREATE (REPLACE can't alter return type).
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
  category_name        TEXT
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
    bc.name           AS category_name
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  LEFT JOIN public.business_ratings br ON br.business_id = biz.id
  WHERE
    biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND b.location IS NOT NULL
    AND ST_DWithin(
          b.location,
          ST_MakePoint(lng, lat)::geography,
          LEAST(radius_meters, 50000)  -- cap at 50 km — prevents full-table scan DoS
        )
  GROUP BY
    b.id, b.name, b.address, b.location,
    biz.id, biz.shop_name, biz.description, biz.logo_url, biz.interior_images,
    bt.name, bc.name
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_businesses(FLOAT, FLOAT, INT) TO anon, authenticated;

-- 2) business_branches: branches (with coords) for a single verified business.
--    Used by the mobile business-detail route, which can't decode PostGIS via the
--    PostgREST nested select. SECURITY DEFINER mirrors nearby_businesses so RLS on
--    branches doesn't block public reads of verified shops.
CREATE OR REPLACE FUNCTION public.business_branches(p_business_id UUID)
RETURNS TABLE (
  id        UUID,
  name      TEXT,
  address   TEXT,
  latitude  FLOAT,
  longitude FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
  SELECT
    b.id,
    b.name,
    b.address,
    ST_Y(b.location::geometry) AS latitude,
    ST_X(b.location::geometry) AS longitude
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  WHERE b.business_id = p_business_id
    AND biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND b.archived_at IS NULL
  ORDER BY b.created_at NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.business_branches(UUID) TO anon, authenticated;
