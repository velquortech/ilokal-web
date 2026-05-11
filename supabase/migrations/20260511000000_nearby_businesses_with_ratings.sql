DROP FUNCTION IF EXISTS public.nearby_businesses(FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION public.nearby_businesses(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 5000
)
RETURNS TABLE (
  branch_id UUID,
  branch_name TEXT,
  address TEXT,
  distance_meters FLOAT,
  business_id UUID,
  business_name TEXT,
  business_description TEXT,
  logo_url TEXT,
  interior_images TEXT[],
  average_rating NUMERIC,
  rating_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id            AS branch_id,
    b.name          AS branch_name,
    b.address,
    ST_Distance(b.location, ST_MakePoint(lng, lat)::geography) AS distance_meters,
    biz.id          AS business_id,
    biz.shop_name   AS business_name,
    biz.description AS business_description,
    biz.logo_url,
    biz.interior_images,
    COALESCE(ROUND(AVG(br.rating)::numeric, 1), 0) AS average_rating,
    COALESCE(COUNT(br.id), 0)                       AS rating_count
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_ratings br ON br.business_id = biz.id
  WHERE
    biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND b.location IS NOT NULL
    AND ST_DWithin(b.location, ST_MakePoint(lng, lat)::geography, radius_meters)
  GROUP BY
    b.id, b.name, b.address, b.location,
    biz.id, biz.shop_name, biz.description, biz.logo_url, biz.interior_images
  ORDER BY distance_meters ASC;
$$;
