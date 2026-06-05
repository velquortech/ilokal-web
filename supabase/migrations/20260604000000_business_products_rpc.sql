-- ============================================================
-- business_products(p_business_id) — set-returning RPC
-- ------------------------------------------------------------
-- Returns one row per available/active product for a business, with the
-- rating average + count aggregated in SQL (previously computed in JS in the
-- products route after fetching every row). Exposing the aggregates as real
-- columns lets the mobile products/menu screen filter (ilike), sort
-- (price / rating / popular) AND range-paginate server-side via PostgREST —
-- the same "RPC as relation" pattern used by nearby_businesses, so search /
-- order / range / count:'exact' apply on top without baking them into the
-- function.
--
--   * average_rating — round(avg(rating), 1), 0 when unrated
--   * rating_count   — number of ratings
--   * popularity     — avg(rating) * ln(1 + rating_count); the menu's default
--                      "Popular" sort key (mirrors the mobile productTrendScore
--                      rating fallback; there is no weekly_view_count column).
-- ============================================================

CREATE OR REPLACE FUNCTION public.business_products(p_business_id UUID)
RETURNS TABLE (
  id             UUID,
  name           TEXT,
  description    TEXT,
  price          NUMERIC,
  sale_price     NUMERIC,
  price_type     TEXT,
  price_unit     TEXT,
  image_url      TEXT,
  is_available   BOOLEAN,
  category       JSONB,
  average_rating NUMERIC,
  rating_count   BIGINT,
  popularity     DOUBLE PRECISION
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
    COALESCE(AVG(r.rating), 0) * LN(1 + COUNT(r.rating)) AS popularity
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
