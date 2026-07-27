-- ============================================================
-- Offerings model — phase 3c: surface the offering columns on the mobile RPC
-- (.claude/OFFERINGS_MODEL.md — OF6, contract rule D6)
-- ------------------------------------------------------------
-- `business_products` backs the mobile menu screen. It projects an explicit
-- column list, so the phase-1/3 columns are invisible to mobile until added
-- here. Purely ADDITIVE: existing keys keep their exact name, type, and
-- meaning, and old clients ignore the new ones.
--
-- Everything else (WHERE, GROUP BY, the aggregates, the "RPC as relation"
-- shape that lets PostgREST filter/order/range on top) is unchanged — the
-- route still applies search / sort / pagination against the result.
--
-- Rollback: re-run 20260604000000's definition.
-- ============================================================

DROP FUNCTION IF EXISTS public.business_products(UUID);

CREATE OR REPLACE FUNCTION public.business_products(p_business_id UUID)
RETURNS TABLE (
  id                 UUID,
  name               TEXT,
  description        TEXT,
  price              NUMERIC,
  sale_price         NUMERIC,
  price_type         TEXT,
  price_unit         TEXT,
  image_url          TEXT,
  is_available       BOOLEAN,
  category           JSONB,
  average_rating     NUMERIC,
  rating_count       BIGINT,
  popularity         DOUBLE PRECISION,
  -- phase 1 / 3 additions
  kind               TEXT,
  booking_mode       TEXT,
  duration_minutes   INTEGER,
  lead_time_minutes  INTEGER,
  inventory_count    INTEGER,
  capacity           INTEGER,
  deposit_amount     NUMERIC,
  min_duration_units INTEGER,
  max_duration_units INTEGER,
  service_location   TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
    COALESCE(AVG(r.rating), 0) * LN(1 + COUNT(r.rating)) AS popularity,
    p.kind::TEXT,
    p.booking_mode::TEXT,
    p.duration_minutes,
    p.lead_time_minutes,
    p.inventory_count,
    p.capacity,
    p.deposit_amount,
    p.min_duration_units,
    p.max_duration_units,
    p.service_location::TEXT
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN public.ratings r ON r.product_id = p.id
  WHERE p.business_id = p_business_id
    AND p.is_available = true
    AND p.status = 'active'
    AND p.archived_at IS NULL
  GROUP BY p.id, c.id, c.name, c.slug;
$$;

-- DROP FUNCTION discards the old grants and Postgres re-grants EXECUTE to
-- PUBLIC by default, so revoke before granting the intended roles.
REVOKE ALL ON FUNCTION public.business_products(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_products(UUID) TO anon, authenticated;
