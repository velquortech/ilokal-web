-- Let the nearby feed filter to CLAIMED businesses, and rank them first.
--
-- WHY: Home's "Nearest Businesses" row is curated discovery — the shops we are
-- recommending — whereas Explore is an exhaustive radius browse. Seeding the
-- directory from OpenStreetMap put ~1,480 unclaimed listings in front of 21
-- owner-registered ones, which swamps that row: the nearest few results are now
-- almost always seeded, image-less entries nobody has vouched for.
--
-- This MUST be a server-side filter. Client-side filtering cannot work at this
-- ratio — fetching the nearest 10 and keeping the claimed ones yields zero
-- essentially every time, because all 10 are seeded.
--
-- Two knobs, because the two surfaces want different things:
--
--   * `claimed_only`      — Home's curated rows: hide seeded listings outright.
--   * `sort_claimed_first` — Explore: show everything, but put the businesses an
--     owner has actually claimed at the top of every filter and every page.
--     Explore is meant to be exhaustive, so hiding the directory there would
--     defeat the seeding; ranking is the right lever.
--
-- Both default to FALSE, so every existing caller is unaffected.
--
-- Ordering note: `sort_featured_first` still outranks the claim rank. That is
-- not a conflict — a featured business holds a paid subscription, which only an
-- owner can buy, so it is claimed by construction.
--
-- DROP + CREATE again: a new IN parameter changes the signature, and
-- CREATE OR REPLACE cannot do that (it would register an ambiguous overload
-- instead). Body is otherwise identical to 20261001010000 — only the parameter,
-- the WHERE clause and the GRANT signature differ.
--
-- Remember to regenerate `lib/types/database.ts` after applying this.

DROP FUNCTION IF EXISTS public.nearby_businesses_filtered(
  FLOAT, FLOAT, INT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN
);

CREATE FUNCTION public.nearby_businesses_filtered(
  lat                  FLOAT,
  lng                  FLOAT,
  radius_meters        INT DEFAULT 5000,
  filter_business_type TEXT DEFAULT NULL,  -- exact business_types.name
  filter_category_name TEXT DEFAULT NULL,  -- exact business_categories.name
  search               TEXT DEFAULT NULL,  -- ILIKE across name/type/category/description
  page_size            INT DEFAULT 10,      -- NULL = no LIMIT (return ALL rows)
  page_offset          INT DEFAULT 0,
  sort_featured_first  BOOLEAN DEFAULT FALSE, -- legacy Home preview: promoted first
  -- TRUE = only businesses an owner has claimed (Home's curated rows).
  -- FALSE = the whole verified directory, seeded listings included (Explore).
  claimed_only         BOOLEAN DEFAULT FALSE,
  -- TRUE = claimed businesses rank above unclaimed ones, within every filter
  -- and across pagination (Explore).
  sort_claimed_first   BOOLEAN DEFAULT FALSE
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
  banner_url           TEXT,
  interior_images      TEXT[],
  average_rating       NUMERIC,
  rating_count         BIGINT,
  business_type        TEXT,
  category_name        TEXT,
  weekly_view_count    INTEGER,
  is_trending          BOOLEAN,
  is_featured          BOOLEAN,
  is_new               BOOLEAN,
  -- NEW. False only for a seeded listing nobody has claimed yet.
  is_claimed           BOOLEAN,
  total_count          BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
WITH search_params AS (
  -- Escape LIKE metacharacters in the user's search term so a literal % or _
  -- is matched literally and cannot widen the match to every row. Order
  -- matters: escape the escape character itself FIRST, then % and _.
  SELECT
    NULLIF(btrim(search), '') AS raw_search,
    REPLACE(REPLACE(REPLACE(COALESCE(search, ''), '\', '\\'), '%', '\%'), '_', '\_') AS escaped_search
),
params AS (
  -- The 80th-percentile view threshold is a property of the whole verified
  -- set, not of any row — compute it once instead of per row.
  SELECT percentile_cont(0.8) WITHIN GROUP (ORDER BY weekly_view_count) AS p80
  FROM public.businesses
  WHERE status = 'verified' AND archived_at IS NULL
),
filtered AS (
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
    biz.banner_url,
    biz.interior_images,
    bt.name           AS business_type,
    bc.name           AS category_name,
    biz.weekly_view_count,
    biz.created_at,
    -- NEW. An owner-registered row is claimed by definition — the person who
    -- created it was authenticated as its owner — so `source = 'owner'` counts
    -- even though 20261001000000 also backfilled `claimed_at` for those rows.
    -- Checking both means a future source that skips the backfill still reads
    -- correctly.
    (biz.claimed_at IS NOT NULL OR biz.source = 'owner') AS is_claimed,
    EXISTS (
      -- Active, in-period subscription on a promo-boost plan = paid placement.
      SELECT 1
      FROM public.business_subscriptions bs
      JOIN public.subscription_plans sp ON sp.id = bs.plan_id
      WHERE bs.business_id = biz.id
        AND bs.status = 'active'
        AND bs.current_period_end > NOW()
        AND sp.features_promo_boost = TRUE
    ) AS is_featured
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  CROSS JOIN search_params sp
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
    -- Category / sub-category / search filter BEFORE the expensive parts, so
    -- a one-category page never scans/computes the whole radius.
    -- Claim gate. Applied here with the other filters, before any aggregation,
    -- so a claimed-only page never pays to rank 1,480 seeded rows it will
    -- discard. Mirrors the `is_claimed` expression below: an owner-registered
    -- row counts as claimed even if `claimed_at` was never stamped.
    AND (
      NOT claimed_only
      OR biz.claimed_at IS NOT NULL
      OR biz.source = 'owner'
    )
    AND (filter_business_type IS NULL OR bt.name = filter_business_type)
    AND (filter_category_name IS NULL OR bc.name = filter_category_name)
    AND (
      sp.raw_search IS NULL
      OR biz.shop_name ILIKE '%' || sp.escaped_search || '%' ESCAPE '\'
      OR bt.name ILIKE '%' || sp.escaped_search || '%' ESCAPE '\'
      OR bc.name ILIKE '%' || sp.escaped_search || '%' ESCAPE '\'
      OR biz.description ILIKE '%' || sp.escaped_search || '%' ESCAPE '\'
    )
),
counted AS (
  SELECT
    f.*,
    COUNT(*) OVER () AS total_count,
    -- Trend flag: >= the 80th percentile of weekly views. The percentile
    -- itself comes from the params CTE (computed once, not per row).
    (f.weekly_view_count > 0 AND f.weekly_view_count >= (SELECT p80 FROM params)) AS is_trending,
    -- Listed within the last 7 days (verified rows are already filtered above).
    (f.created_at > NOW() - INTERVAL '7 days') AS is_new
  FROM filtered f
),
page AS (
  SELECT *
  FROM counted
  ORDER BY
    CASE WHEN sort_featured_first AND NOT is_featured THEN 1 ELSE 0 END,
    -- Claimed first. Applied inside the paging CTE as well as the final SELECT
    -- below: the two ORDER BYs must agree, or page 2 would be chosen under one
    -- ranking and emitted under another.
    CASE WHEN sort_claimed_first AND NOT is_claimed THEN 1 ELSE 0 END,
    distance_meters ASC,
    branch_id ASC  -- stable pagination tiebreaker
  LIMIT CASE
    WHEN page_size IS NULL THEN NULL  -- no cap: return every filtered row
    ELSE GREATEST(LEAST(page_size, 50), 1)
  END
  OFFSET GREATEST(COALESCE(page_offset, 0), 0)
)
SELECT
  p.branch_id,
  p.branch_name,
  p.address,
  p.branch_lat,
  p.branch_lng,
  p.distance_meters,
  p.business_id,
  p.business_name,
  p.business_description,
  p.logo_url,
  p.banner_url,
  p.interior_images,
  COALESCE(r.average_rating, 0)       AS average_rating,
  COALESCE(r.rating_count, 0)         AS rating_count,
  p.business_type,
  p.category_name,
  p.weekly_view_count,
  p.is_trending,
  p.is_featured,
  p.is_new,
  p.is_claimed,
  p.total_count
FROM page p
LEFT JOIN LATERAL (
  -- Ratings tallied per business, only for the page's rows (idx
  -- idx_business_ratings_business serves the probe).
  SELECT
    ROUND(AVG(rating)::numeric, 1) AS average_rating,
    COUNT(*)::bigint                AS rating_count
  FROM public.business_ratings br
  WHERE br.business_id = p.business_id
) r ON true
ORDER BY
  CASE WHEN sort_featured_first AND NOT p.is_featured THEN 1 ELSE 0 END,
  CASE WHEN sort_claimed_first AND NOT p.is_claimed THEN 1 ELSE 0 END,
  p.distance_meters ASC,
  p.branch_id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_businesses_filtered(
  FLOAT, FLOAT, INT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN, BOOLEAN, BOOLEAN
) TO anon, authenticated;
