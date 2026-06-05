-- nearby_businesses: add a "show all" bypass and raise the distance cap.
--
--   * radius_meters <= 0  → bypass the ST_DWithin distance filter entirely and
--     return every verified business (still ordered nearest-first). The mobile
--     app sends radius=0 for its "All" radius option.
--   * positive radius     → distance filter as before, but the safety cap is
--     raised 50 km → 100 km so the 100 km preset filters as intended (previously
--     it was silently clamped to 50 km).
--
-- Signature unchanged, so CREATE OR REPLACE keeps existing grants.

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
    AND (
      radius_meters <= 0   -- 0 = no limit: bypass distance filter, show all
      OR ST_DWithin(
           b.location,
           ST_MakePoint(lng, lat)::geography,
           LEAST(radius_meters, 100000)  -- cap at 100 km — prevents full-table scan DoS
         )
    )
  GROUP BY
    b.id, b.name, b.address, b.location,
    biz.id, biz.shop_name, biz.description, biz.logo_url, biz.interior_images,
    bt.name, bc.name
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_businesses(FLOAT, FLOAT, INT) TO anon, authenticated;
