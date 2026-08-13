-- Bida Ngayon feed — rank across the full filtered universe, then slice pages.
--
-- Mirrors the mobile client's productTrendScore bit-for-bit
-- (ilokal-mobile services/businesses.ts, spec docs/superpowers/specs/
-- 2026-08-12-mobile-popular-products-api.md §4). The board must not visibly
-- reorder the day the client flips to this endpoint, so the score formula and
-- ordering below are a contract — change them only with a coordinated
-- mobile-side flag flip (USE_POPULAR_PRODUCTS_ENDPOINT).
--
-- Two functions:
--   1. popular_products_feed  — the ranked board (one best product per
--      business, trend score descending, deterministic tie-break), paginated
--      with the match total carried on every row (COUNT(*) OVER).
--   2. popular_fresh_products — the "New on the board" rail: freshly-listed
--      businesses (created ≤ 7 days, the same is_new definition as the
--      nearby RPCs) with their best product each, newest listing first,
--      capped (the rail's counterpart of the client scan's FRESH_POOL_SEATS).
--
-- Conventions follow nearby_businesses_filtered (20260812120000): named
-- filter params passed through from the route, `search_path = public, postgis`
-- pinned, SECURITY DEFINER (read-only over already-public data), LIKE
-- metacharacters escaped, radius_meters <= 0 = unbounded with the 100 km cap,
-- and GRANTs to anon + authenticated (the route calls via the bearer client).

-- ── 1. The ranked board ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.popular_products_feed(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 0,          -- 0 = unbounded (RADIUS_ALL sentinel)
  filter_business_type TEXT DEFAULT NULL, -- exact business_types.name
  filter_category_name TEXT DEFAULT NULL, -- exact business_categories.name
  search TEXT DEFAULT NULL,             -- ILIKE over business/product/type/category
  page_size INT DEFAULT 10,             -- NULL = no LIMIT (return ALL rows)
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  product_id         UUID,
  product_name       TEXT,
  product_image_url  TEXT,
  price              NUMERIC,
  price_type         TEXT,
  price_unit         TEXT,
  weekly_view_count  INTEGER,
  average_rating     NUMERIC,
  rating_count       BIGINT,
  business_id        UUID,
  business_name      TEXT,
  business_logo_url  TEXT,
  business_banner_url TEXT,
  distance_meters    FLOAT,
  is_new             BOOLEAN,
  total_count        BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
WITH search_params AS (
  -- Escape LIKE metacharacters so a literal % or _ matches literally (same
  -- rule as nearby_businesses_filtered).
  SELECT
    NULLIF(btrim(search), '') AS raw_search,
    REPLACE(REPLACE(REPLACE(COALESCE(search, ''), '\', '\\'), '%', '\%'), '_', '\_') AS escaped_search
),
-- Every available product of every verified business, with its trend score,
-- its ratings aggregation (same LEFT JOIN / COALESCE rule as business_products),
-- and (bounded-radius only) the nearest branch's distance.
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
    biz.created_at,
    br.distance_meters,
    -- Fresh tier: created within the last 7 days — the SAME is_new definition
    -- as the nearby RPCs (20260811000000), so the board's NEW rail and the
    -- spotlight's NEW tier can never disagree.
    (biz.created_at > NOW() - INTERVAL '7 days') AS is_new,
    -- Client productTrendScore, exactly (ilokal-mobile services/businesses.ts):
    --   weekly_view_count when present, else rating * ln(1 + count).
    CASE
      WHEN p.weekly_view_count IS NOT NULL
        THEN p.weekly_view_count::DOUBLE PRECISION
      ELSE COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0)
             * LN(1 + COUNT(r.rating))
    END                                     AS trend_score
  FROM public.products p
  JOIN public.businesses biz ON biz.id = p.business_id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  LEFT JOIN public.ratings r ON r.product_id = p.id
  -- Nearest branch per business — one row per product, so the per-business
  -- ranking below is never multiplied by branch count.
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
    AND (filter_category_name IS NULL OR bc.name = filter_category_name)
    AND (
      sp.raw_search IS NULL
      OR biz.shop_name ILIKE '%' || sp.escaped_search || '%'
      OR p.name ILIKE '%' || sp.escaped_search || '%'
      OR bt.name ILIKE '%' || sp.escaped_search || '%'
      OR bc.name ILIKE '%' || sp.escaped_search || '%'
    )
  GROUP BY
    p.id, biz.id, biz.shop_name, biz.logo_url, biz.banner_url, biz.created_at,
    bc.name, bt.name, br.distance_meters
),
-- One product per business: the single highest-scoring AVAILABLE product
-- (spec §4 rule 1 — a mega-menu business must not flood the board).
best_per_business AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id
      ORDER BY c.trend_score DESC, c.rating_count DESC, c.product_id ASC
    ) AS rn
  FROM candidates c
),
-- Rank the per-business winners across the WHOLE filtered universe and carry
-- the match total (COUNT(*) OVER) so the route needs no second count pass.
ranked AS (
  SELECT b.*,
    ROW_NUMBER() OVER (
      ORDER BY b.trend_score DESC, b.rating_count DESC, b.product_id ASC
    ) AS global_rank,
    COUNT(*) OVER () AS total_count
  FROM best_per_business b
  WHERE b.rn = 1
)
SELECT
  r.product_id, r.product_name, r.product_image_url, r.price, r.price_type,
  r.price_unit, r.weekly_view_count, r.average_rating, r.rating_count,
  r.business_id, r.business_name, r.business_logo_url, r.business_banner_url,
  r.distance_meters, r.is_new, r.total_count
FROM ranked r
ORDER BY r.global_rank
LIMIT page_size OFFSET page_offset;
$$;

-- ── 2. The "New on the board" rail ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.popular_fresh_products(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 0,
  filter_business_type TEXT DEFAULT NULL,
  filter_category_name TEXT DEFAULT NULL,
  search TEXT DEFAULT NULL,
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  product_id         UUID,
  product_name       TEXT,
  product_image_url  TEXT,
  price              NUMERIC,
  price_type         TEXT,
  price_unit         TEXT,
  weekly_view_count  INTEGER,
  average_rating     NUMERIC,
  rating_count       BIGINT,
  business_id        UUID,
  business_name      TEXT,
  business_logo_url  TEXT,
  business_banner_url TEXT,
  distance_meters    FLOAT,
  is_new             BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
WITH search_params AS (
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
    biz.created_at,
    br.distance_meters,
    CASE
      WHEN p.weekly_view_count IS NOT NULL
        THEN p.weekly_view_count::DOUBLE PRECISION
      ELSE COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0)
             * LN(1 + COUNT(r.rating))
    END                                     AS trend_score
  FROM public.products p
  JOIN public.businesses biz ON biz.id = p.business_id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  LEFT JOIN public.ratings r ON r.product_id = p.id
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
    -- The whole point of the rail: businesses listed within the last 7 days.
    AND biz.created_at > NOW() - INTERVAL '7 days'
    AND p.is_available = TRUE
    AND p.status = 'active'
    AND p.archived_at IS NULL
    AND (radius_meters <= 0 OR br.distance_meters <= LEAST(radius_meters, 100000))
    AND (filter_business_type IS NULL OR bt.name = filter_business_type)
    AND (filter_category_name IS NULL OR bc.name = filter_category_name)
    AND (
      sp.raw_search IS NULL
      OR biz.shop_name ILIKE '%' || sp.escaped_search || '%'
      OR p.name ILIKE '%' || sp.escaped_search || '%'
      OR bt.name ILIKE '%' || sp.escaped_search || '%'
      OR bc.name ILIKE '%' || sp.escaped_search || '%'
    )
  GROUP BY
    p.id, biz.id, biz.shop_name, biz.logo_url, biz.banner_url, biz.created_at,
    bc.name, bt.name, br.distance_meters
),
best_per_business AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id
      ORDER BY c.trend_score DESC, c.rating_count DESC, c.product_id ASC
    ) AS rn
  FROM candidates c
)
SELECT
  b.product_id, b.product_name, b.product_image_url, b.price, b.price_type,
  b.price_unit, b.weekly_view_count, b.average_rating, b.rating_count,
  b.business_id, b.business_name, b.business_logo_url, b.business_banner_url,
  b.distance_meters, TRUE AS is_new
FROM best_per_business b
WHERE b.rn = 1
ORDER BY b.created_at DESC, b.trend_score DESC, b.product_id ASC
LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.popular_products_feed(
  FLOAT, FLOAT, INT, TEXT, TEXT, TEXT, INT, INT
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.popular_fresh_products(
  FLOAT, FLOAT, INT, TEXT, TEXT, TEXT, INT
) TO anon, authenticated;
