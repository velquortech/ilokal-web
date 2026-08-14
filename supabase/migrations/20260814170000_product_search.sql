-- Full-catalog product search for the Home search bar's suggestions
-- (ilokal-mobile hooks/useSearchSuggestions.ts).
--
-- The popular_products_feed RPC (20260814020000) is the Bida Ngayon ranking:
-- it matches product/business names too, but only within the TRENDING pool and
-- ranked by trend score — a long-tail product with few views is unreachable.
-- This RPC is the "does it exist anywhere" probe: every available product of
-- every verified business, ranked by relevance (name-prefix first, then
-- popularity), one product per business (so a mega-menu shop can't flood the
-- three suggestion slots). Returns the SAME row shape as the feed, so the
-- route reuses the feed's row mapping and the app reuses the wire→PopularProduct
-- mapper unchanged.

CREATE OR REPLACE FUNCTION public.product_search(
  search TEXT,
  limit_count INT DEFAULT 10
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT,
  price NUMERIC,
  price_type TEXT,
  price_unit TEXT,
  weekly_view_count INT,
  average_rating NUMERIC,
  rating_count INT,
  business_id UUID,
  business_name TEXT,
  business_logo_url TEXT,
  business_banner_url TEXT,
  distance_meters NUMERIC,
  is_new BOOLEAN
)
LANGUAGE sql
STABLE
SET search_path = public, postgis
AS $$
WITH search_params AS (
  -- Escape LIKE metacharacters so a literal % or _ matches literally (same
  -- rule as popular_products_feed / nearby_businesses_filtered).
  SELECT
    NULLIF(btrim(search), '') AS raw_search,
    REPLACE(REPLACE(REPLACE(COALESCE(search, ''), '\', '\\'), '%', '\%'), '_', '\_') AS escaped_search
),
candidates AS (
  SELECT
    p.id                                    AS product_id,
    p.name                                  AS product_name,
    p.image_url                             AS product_image_url,
    p.price,
    p.price_type::TEXT                      AS price_type,
    p.price_unit::TEXT                      AS price_unit,
    p.weekly_view_count,
    COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0) AS average_rating,
    COUNT(r.rating)                         AS rating_count,
    biz.id                                  AS business_id,
    biz.shop_name                           AS business_name,
    biz.logo_url                            AS business_logo_url,
    biz.banner_url                          AS business_banner_url,
    (biz.created_at > NOW() - INTERVAL '7 days') AS is_new,
    -- Relevance: a name that STARTS with the query outranks a substring hit.
    -- Exact matches are prefix matches, so no third tier is needed.
    (p.name ILIKE sp.raw_search || '%')     AS name_prefix
  FROM public.products p
  JOIN public.businesses biz ON biz.id = p.business_id
  LEFT JOIN public.ratings r ON r.product_id = p.id
  CROSS JOIN search_params sp
  WHERE biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND p.is_available = TRUE
    AND p.status = 'active'
    AND p.archived_at IS NULL
    AND (
      p.name ILIKE '%' || sp.escaped_search || '%'
      OR biz.shop_name ILIKE '%' || sp.escaped_search || '%'
    )
  GROUP BY
    p.id, p.name, p.image_url, p.price, p.price_type, p.price_unit,
    p.weekly_view_count, biz.id, biz.shop_name, biz.logo_url, biz.banner_url,
    biz.created_at, sp.raw_search
),
-- One product per business: the single most relevant available product (the
-- same no-flooding rule as the feed's best_per_business, so a bakery with ten
-- "brittle" SKUs takes one suggestion slot, not all of them).
best_per_business AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id
      ORDER BY c.name_prefix DESC, c.weekly_view_count DESC NULLS LAST,
               c.rating_count DESC, c.product_id ASC
    ) AS rn
  FROM candidates c
)
SELECT
  b.product_id, b.product_name, b.product_image_url, b.price, b.price_type,
  b.price_unit, b.weekly_view_count, b.average_rating, b.rating_count,
  b.business_id, b.business_name, b.business_logo_url, b.business_banner_url,
  NULL::numeric AS distance_meters, b.is_new
FROM best_per_business b
WHERE b.rn = 1
ORDER BY b.name_prefix DESC, b.weekly_view_count DESC NULLS LAST,
         b.rating_count DESC, b.product_id ASC
LIMIT limit_count;
$$;
