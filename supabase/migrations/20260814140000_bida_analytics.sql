-- Owner Bida Ngayon analytics — the data model behind "your item's Bida
-- Ngayon ranking this week" (spec docs/superpowers/specs/
-- 2026-08-12-owner-bida-ngayon-analytics.md).
--
-- Three pieces:
--   1. `view_count_history` — a daily snapshot of every eligible product's
--      rolling-7-day count, trend score, and global rank. This is the history
--      `weekly_view_count` (point-in-time, overwritten nightly) and
--      `view_events` (pruned at 8 days) cannot provide: week-over-week deltas,
--      rank deltas, and sparklines all read from here.
--   2. `product_trend_score(...)` — the ONE score function. It was inline in
--      the feed RPCs; this migration extracts it so the feed, the fresh tier,
--      and the nightly snapshot can never drift (a rank analytics shows must
--      be the same number the customer board ranks by).
--   3. `snapshot_weekly_view_history()` — the nightly job sibling of
--      `rollup_weekly_view_counts()`: writes today's snapshot (same
--      one-best-product-per-business + universe ranking as the feed) and
--      prunes history past 90 days.
--
-- The feed RPCs are recreated with the extracted helper — behavior-identical,
-- guarded by the feed's "same top-8" acceptance criterion.

-- ── 1. The snapshot table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.view_count_history (
  product_id        uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  business_id       uuid    NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  snapshot_date     date    NOT NULL,          -- EOD of the window END (rollup runs 03:15)
  weekly_view_count integer NOT NULL,          -- rolling 7 days as of that date
  trend_score       numeric NOT NULL,          -- product_trend_score at that date
  -- The product's rank across the whole verified universe that day — NULL for
  -- every product except its business's single highest-scoring available item
  -- (the feed's one-board-contender rule; siblings get catalog rank only).
  global_rank       integer,
  PRIMARY KEY (product_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_view_count_history_business_date
  ON public.view_count_history (business_id, snapshot_date);

-- ── 2. The shared score ─────────────────────────────────────────────────────

-- The client productTrendScore (ilokal-mobile services/businesses.ts), exactly:
--   weekly_view_count when present, else average_rating * ln(1 + rating_count).
-- Used by the feed RPCs AND the snapshot job — one source of truth.
CREATE OR REPLACE FUNCTION public.product_trend_score(
  p_weekly_view_count integer,
  p_average_rating numeric,
  p_rating_count bigint
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_weekly_view_count IS NOT NULL THEN p_weekly_view_count
    ELSE COALESCE(p_average_rating, 0) * ln(1 + COALESCE(p_rating_count, 0))
  END;
$$;

GRANT EXECUTE ON FUNCTION public.product_trend_score(integer, numeric, bigint)
  TO anon, authenticated;

-- ── 3. The feed RPCs, refactored onto the shared score ──────────────────────

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
    biz.created_at                          AS business_created_at,
    p.created_at                            AS product_created_at,
    br.distance_meters,
    (biz.created_at > NOW() - INTERVAL '7 days'
     OR p.created_at > NOW() - INTERVAL '7 days') AS is_new,
    -- The shared score (20260814140000) — the feed and the analytics snapshot
    -- rank by the SAME function, so an owner's rank can never contradict the
    -- board.
    public.product_trend_score(
      p.weekly_view_count,
      COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0),
      COUNT(r.rating)
    )                                       AS trend_score
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
    p.created_at, bc.name, bt.name, br.distance_meters
),
best_per_business AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id
      ORDER BY c.trend_score DESC, c.rating_count DESC, c.product_id ASC
    ) AS rn
  FROM candidates c
),
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
    biz.created_at                          AS business_created_at,
    p.created_at                            AS product_created_at,
    br.distance_meters,
    public.product_trend_score(
      p.weekly_view_count,
      COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0),
      COUNT(r.rating)
    )                                       AS trend_score
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
    AND (biz.created_at > NOW() - INTERVAL '7 days'
         OR p.created_at > NOW() - INTERVAL '7 days')
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
    p.created_at, bc.name, bt.name, br.distance_meters
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
ORDER BY GREATEST(b.business_created_at, b.product_created_at) DESC,
         b.trend_score DESC, b.product_id ASC
LIMIT limit_count;
$$;

-- ── 4. The nightly snapshot ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.snapshot_weekly_view_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, postgis
AS $$
WITH candidates AS (
  SELECT
    p.id                                    AS product_id,
    p.business_id,
    p.weekly_view_count,
    COUNT(r.rating)                         AS rating_count,
    public.product_trend_score(
      p.weekly_view_count,
      COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0),
      COUNT(r.rating)
    )                                       AS trend_score
  FROM public.products p
  JOIN public.businesses b ON b.id = p.business_id
  LEFT JOIN public.ratings r ON r.product_id = p.id
  WHERE b.status = 'verified'
    AND b.archived_at IS NULL
    AND p.is_available = TRUE
    AND p.status = 'active'
    AND p.archived_at IS NULL
  GROUP BY p.id, p.business_id, p.weekly_view_count
),
-- One best product per business (the feed's rule) — its rank in the universe
-- is the number the customer board shows; siblings keep history (sparklines,
-- deltas) but no global rank.
best_per_business AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id
      ORDER BY c.trend_score DESC, c.rating_count DESC, c.product_id ASC
    ) AS rn
  FROM candidates c
),
ranked AS (
  SELECT b.*,
    ROW_NUMBER() OVER (
      ORDER BY b.trend_score DESC, b.rating_count DESC, b.product_id ASC
    ) AS global_rank
  FROM best_per_business b
  WHERE b.rn = 1
)
INSERT INTO public.view_count_history (
  product_id, business_id, snapshot_date, weekly_view_count, trend_score, global_rank
)
SELECT
  r.product_id, r.business_id, CURRENT_DATE,
  r.weekly_view_count, r.trend_score, r.global_rank
FROM ranked r
ON CONFLICT (product_id, snapshot_date) DO UPDATE
  SET weekly_view_count = EXCLUDED.weekly_view_count,
      trend_score       = EXCLUDED.trend_score,
      global_rank       = EXCLUDED.global_rank;

-- History past 90 days can never feed a delta again — prune it (the same job).
DELETE FROM public.view_count_history
WHERE snapshot_date < CURRENT_DATE - 90;
$$;

-- Maintenance-only (the cron job below), never a client RPC — same hardening
-- as rollup_weekly_view_counts.
REVOKE EXECUTE ON FUNCTION public.snapshot_weekly_view_history()
  FROM PUBLIC, anon, authenticated;

-- Nightly snapshot, after the rollup (03:15) has refreshed the counts. Wrapped
-- so environments without pg_cron still apply the migration (history then
-- fills the next time the function runs manually).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule('snapshot-weekly-view-history');
  PERFORM cron.schedule(
    'snapshot-weekly-view-history',
    '15 3 * * *',
    $job$SELECT public.snapshot_weekly_view_history()$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable — schedule snapshot_weekly_view_history() manually (%).', SQLERRM;
END;
$$;
