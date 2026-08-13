-- Facet counts for the Bida Ngayon board's Sub-category sheet — the "Bakery
-- (12)" numbers next to each sub-category name. The board fetches these only
-- when a parent type is picked (the sub-category dropdown renders then), so
-- the default board load never pays for them.
--
-- The universe mirrors popular_products_feed's `candidates` CTE exactly
-- (same verified/available/radius/business-type/search filters), but counts
-- PRODUCTS per business_categories.name instead of ranking one-per-business —
-- a sub-category filter applies at the product level, so the count answers
-- "how many products sit under this sub-category in the current view?".
CREATE OR REPLACE FUNCTION public.popular_products_facets(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 0,          -- 0 = unbounded (RADIUS_ALL sentinel)
  filter_business_type TEXT DEFAULT NULL, -- exact business_types.name
  search TEXT DEFAULT NULL              -- ILIKE over business/product/type/category
)
RETURNS TABLE (
  category_name  TEXT,
  product_count  BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
WITH search_params AS (
  -- Escape LIKE metacharacters (same rule as popular_products_feed).
  SELECT
    NULLIF(btrim(search), '') AS raw_search,
    REPLACE(REPLACE(REPLACE(COALESCE(search, ''), '\', '\\'), '%', '\%'), '_', '\_') AS escaped_search
),
-- Every available product of every verified business within the view, with
-- (bounded-radius only) the nearest branch's distance — the feed's candidates
-- minus the ratings join and trend score, which facets don't need.
candidates AS (
  SELECT
    bc.name AS category_name
  FROM public.products p
  JOIN public.businesses biz ON biz.id = p.business_id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  JOIN LATERAL (
    SELECT MIN(ST_Distance(b.location, ST_MakePoint(lng, lat)::geography))
             AS distance_meters
    FROM public.branches b
    WHERE b.business_id = biz.id
      AND b.location IS NOT NULL
  ) br ON true
  CROSS JOIN search_params sp
  WHERE biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND p.is_available = TRUE
    AND p.status = 'active'
    AND p.archived_at IS NULL
    AND (radius_meters <= 0 OR br.distance_meters <= LEAST(radius_meters, 100000))
    AND (filter_business_type IS NULL OR bt.name = filter_business_type)
    AND (
      sp.raw_search IS NULL
      OR biz.shop_name ILIKE '%' || sp.escaped_search || '%'
      OR p.name ILIKE '%' || sp.escaped_search || '%'
      OR bt.name ILIKE '%' || sp.escaped_search || '%'
      OR bc.name ILIKE '%' || sp.escaped_search || '%'
    )
)
SELECT
  category_name,
  COUNT(*) AS product_count
FROM candidates
WHERE category_name IS NOT NULL
GROUP BY category_name
ORDER BY product_count DESC, category_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.popular_products_facets(FLOAT, FLOAT, INT, TEXT, TEXT)
  TO anon, authenticated, service_role;
