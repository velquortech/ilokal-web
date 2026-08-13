-- Bida Ngayon scan parity (mobile): expose per-product weekly views so the
-- flag-off scan ranks by real view counts instead of the all-zero collapse
-- (every product scored 0 → per-business pick = alphabetically-first product).
-- See docs/superpowers/specs/2026-08-12-mobile-popular-products-api.md §8.
--
-- 1. `weekly_view_count` is projected again (it was dropped from this RPC's
--    projection during the offerings-model rewrite; the mobile scan's
--    `productTrendScore` reads it via `Number(product.weekly_view_count ?? 0)`).
-- 2. `popularity` (the menu "Popular" sort key) is views-led with the same
--    rating-proxy fallback as the scan/feed trend score (spec §4) — the
--    rewrite had switched it to a ratings-only formula, so a zero-rating
--    catalog sorted "Popular" by nothing.

-- The RETURNS TABLE gains a column, so Postgres can't CREATE OR REPLACE —
-- drop and recreate (no dependent objects; PostgREST resolves it at call time).
DROP FUNCTION IF EXISTS public.business_products(uuid);

CREATE OR REPLACE FUNCTION public.business_products(p_business_id uuid)
 RETURNS TABLE(
   id uuid,
   name text,
   description text,
   price numeric,
   sale_price numeric,
   price_type text,
   price_unit text,
   image_url text,
   is_available boolean,
   category jsonb,
   average_rating numeric,
   rating_count bigint,
   weekly_view_count bigint,
   popularity double precision,
   kind text,
   booking_mode text,
   duration_minutes integer,
   lead_time_minutes integer,
   inventory_count integer,
   capacity integer,
   deposit_amount numeric,
   min_duration_units integer,
   max_duration_units integer,
   service_location text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    p.weekly_view_count AS weekly_view_count,
    -- productTrendScore mirror (spec §4): weekly views lead; without them the
    -- rating proxy carries the item. `weekly_view_count` is NOT NULL (default
    -- 0) today, so this is views-led; the proxy branch keeps the intent
    -- explicit and future-proof if the column ever becomes nullable.
    CASE
      WHEN p.weekly_view_count IS NOT NULL
      THEN p.weekly_view_count::double precision
      ELSE COALESCE(AVG(r.rating), 0) * LN(1 + COUNT(r.rating))
    END AS popularity,
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
$function$;

-- The DROP above reset the privileges; restore the pre-existing grants.
GRANT EXECUTE ON FUNCTION public.business_products(uuid) TO anon, authenticated, service_role;
