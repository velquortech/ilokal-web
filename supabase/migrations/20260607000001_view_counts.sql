-- Weekly view counts for businesses + products (demo/denormalized).
--
-- A rolling "profile/product opens in the last 7 days" counter, surfaced as the
-- mobile "Trending" business badge and the product view badge. For now it's a
-- plain denormalized column (seeded with sample numbers, see
-- supabase/seeds/view_counts.sql); a real rolling aggregate over a view-events
-- table can replace the column later without changing the read contract.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS weekly_view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weekly_view_count INTEGER NOT NULL DEFAULT 0;

-- ── Expose on nearby_businesses (drives the business Trending badge) ──────────
-- Body unchanged except the new column in RETURNS TABLE + SELECT + GROUP BY.
-- DROP first: adding a RETURNS TABLE column changes the OUT-param row type, which
-- CREATE OR REPLACE can't do.
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
  weekly_view_count    INTEGER
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
    biz.weekly_view_count
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

-- ── Expose on business_products + fold views into the "Popular" sort ─────────
-- weekly_view_count is now the primary popularity signal (views dominate, the
-- rating score breaks ties), matching the mobile productTrendScore intent.
DROP FUNCTION IF EXISTS public.business_products(UUID);
CREATE OR REPLACE FUNCTION public.business_products(p_business_id UUID)
RETURNS TABLE (
  id                UUID,
  name              TEXT,
  description       TEXT,
  price             NUMERIC,
  sale_price        NUMERIC,
  price_type        TEXT,
  price_unit        TEXT,
  image_url         TEXT,
  is_available      BOOLEAN,
  category          JSONB,
  average_rating    NUMERIC,
  rating_count      BIGINT,
  weekly_view_count INTEGER,
  popularity        DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.sale_price,
    p.price_type::TEXT,
    p.price_unit::TEXT,
    p.image_url,
    p.is_available,
    CASE
      WHEN c.id IS NOT NULL
      THEN jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
      ELSE NULL
    END AS category,
    COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0) AS average_rating,
    COUNT(r.rating) AS rating_count,
    p.weekly_view_count,
    p.weekly_view_count
      + COALESCE(AVG(r.rating), 0) * LN(1 + COUNT(r.rating)) AS popularity
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN public.ratings r ON r.product_id = p.id
  WHERE p.business_id = p_business_id
    AND p.is_available = true
    AND p.status = 'active'
    AND p.archived_at IS NULL
  GROUP BY p.id, c.id, c.name, c.slug;
$$;

GRANT EXECUTE ON FUNCTION public.business_products(UUID) TO anon, authenticated;
