-- Bida of the Day — the editorial daily star that LEADS the hero rotation on
-- the Bida Ngayon board (ilokal-mobile components/home/BidaNgayonHero.tsx).
--
-- Phase 1 of the hero was a purely algorithmic top-5 rotation; this is phase 2:
-- a server-selected pick for each calendar day. The route returns it on page 1
-- (`bida_of_the_day`), the client prepends it to the rotation (deduped against
-- the board), and the leading slide reads "BIDA OF THE DAY". No pick for
-- today / the pick failing the current filters → `null` → the hero falls back
-- to the plain top-5 rotation, so the board is never degraded by the editorial
-- layer.
--
-- The pick lives in `bida_of_the_day` (one row per pick_date). The RPC
-- resolves the row for the MOST RECENT pick_date ≤ CURRENT_DATE and returns it
-- as a full feed-shaped row (same columns as popular_products_feed so the
-- route reuses its row mapper), subject to the SAME filters as the board —
-- the pick is the daily star of the CURRENT view, so if it doesn't qualify
-- (archived, out of radius, wrong category, search miss) the view simply has
-- no bida rather than an irrelevant one.
--
-- Editing the daily star = upserting a row (see seeds/bida_of_the_day.sql for
-- the local demo picks). The uniqueness on pick_date makes the most recent
-- pick unambiguous.

CREATE TABLE IF NOT EXISTS public.bida_of_the_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_date date NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.bida_of_the_day(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 0,          -- 0 = unbounded (RADIUS_ALL sentinel)
  filter_business_type TEXT DEFAULT NULL, -- exact business_types.name
  filter_category_name TEXT DEFAULT NULL, -- exact business_categories.name
  search TEXT DEFAULT NULL              -- ILIKE over business/product/type/category
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
WITH pick AS (
  -- The most recent editorial pick on or before today — one row by
  -- construction (pick_date is UNIQUE).
  SELECT p.*
  FROM public.bida_of_the_day p
  WHERE p.pick_date = (
    SELECT MAX(pick_date)
    FROM public.bida_of_the_day
    WHERE pick_date <= CURRENT_DATE
  )
  LIMIT 1
),
search_params AS (
  SELECT
    NULLIF(btrim(search), '') AS raw_search,
    REPLACE(REPLACE(REPLACE(COALESCE(search, ''), '\', '\\'), '%', '\%'), '_', '\_') AS escaped_search
),
resolved AS (
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
    br.distance_meters,
    -- Same widened fresh definition as the feed (20260814120000).
    (biz.created_at > NOW() - INTERVAL '7 days'
     OR p.created_at > NOW() - INTERVAL '7 days') AS is_new
  FROM pick pk
  JOIN public.products p ON p.id = pk.product_id
  JOIN public.businesses biz ON biz.id = pk.business_id
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
    p.id, biz.id, biz.shop_name, biz.logo_url, biz.banner_url,
    biz.created_at, p.created_at, bc.name, bt.name, br.distance_meters
)
SELECT
  product_id, product_name, product_image_url, price, price_type, price_unit,
  weekly_view_count, average_rating, rating_count, business_id, business_name,
  business_logo_url, business_banner_url, distance_meters, is_new
FROM resolved;
$$;

GRANT EXECUTE ON FUNCTION public.bida_of_the_day(
  FLOAT, FLOAT, INT, TEXT, TEXT, TEXT
) TO anon, authenticated;
