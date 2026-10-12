-- The admin-seeded kill switch.
--
-- WHY: ~1,480 of ~1,500 listings are an open-data directory import that no owner
-- has claimed. If a complaint, a licensing question or a demo ever requires
-- showing only businesses that registered themselves, the only lever today is
-- deleting rows. This is the lever: one setting, enforced server-side, no
-- deploy and no app rebuild.
--
-- It defaults to TRUE (seeded listings visible), so applying this migration
-- changes nothing until someone deliberately flips it. It is an emergency and
-- compliance control, not a normal operating mode.
--
-- Enforcement is in the DATABASE, not the route, because the predicate has to
-- hold for every caller — the mobile feed, the category counts, and anything
-- added later that forgets to ask.

INSERT INTO public.app_settings (key, value)
VALUES ('show_admin_seeded_businesses', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.nearby_businesses_filtered(
  FLOAT, FLOAT, INT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN, BOOLEAN, BOOLEAN
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
    -- Over VIEWED businesses only. Seeding the directory put ~1,480 rows at
    -- zero views into this population, which dragged the 80th percentile to 0 —
    -- so the threshold stopped discriminating and every business with a single
    -- view read as trending (23 of the 24 that had any views at all). The
    -- `weekly_view_count > 0` guard below always kept the zeros themselves out,
    -- which is why this degraded quietly instead of flagging everything.
    AND weekly_view_count > 0
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
    -- created it was authenticated as its owner — so `origin = 'owner'` counts
    -- even though 20261001000000 also backfilled `claimed_at` for those rows.
    -- Checking both means a future source that skips the backfill still reads
    -- correctly.
    (biz.claimed_at IS NOT NULL OR biz.origin = 'owner') AS is_claimed,
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
      OR biz.origin = 'owner'
    )
    -- The admin-seeded kill switch. Off (setting true) this is a no-op; on, the
    -- imported directory disappears from every feed and Explore drops to the
    -- owner-registered businesses alone. Read inline rather than passed as a
    -- parameter: `app_settings` RLS grants SELECT to `authenticated` only, and an
    -- `anon` caller gets zero rows WITHOUT an error, which reads as "not
    -- configured" (see lib/api/appSettings.ts). Guests browse Explore freely, so
    -- a client-side read would fail silently for exactly the people seeing the
    -- most listings. `get_app_setting_bool` is STABLE SECURITY DEFINER and
    -- REVOKEd from anon/authenticated precisely so definer functions like this
    -- one can call it.
    AND (
      biz.origin = 'owner'
      OR public.get_app_setting_bool('show_admin_seeded_businesses', TRUE)
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

-- The category chips must agree with the feed, or a chip offers a filter that
-- returns nothing. CREATE OR REPLACE is fine here: the signature is unchanged.
CREATE OR REPLACE FUNCTION public.nearby_business_type_counts(
  lat FLOAT, lng FLOAT, radius_meters INT DEFAULT 5000
)
RETURNS TABLE(business_type TEXT, category_name TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
  SELECT
    bt.name  AS business_type,
    bc.name  AS category_name,
    COUNT(*) AS count
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
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
    -- Same kill switch as the feed above.
    AND (
      biz.origin = 'owner'
      OR public.get_app_setting_bool('show_admin_seeded_businesses', TRUE)
    )
  GROUP BY bt.name, bc.name
  ORDER BY bt.name, bc.name;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_business_type_counts(FLOAT, FLOAT, INT)
  TO anon, authenticated;

-- Expose the switch to anonymous callers.
--
-- The detail and share routes are PUBLIC, so they cannot read `app_settings`
-- directly: RLS grants SELECT to `authenticated` only, and an `anon` caller
-- gets zero rows and no error — indistinguishable from "not configured". This
-- RPC is the sanctioned anon-safe path (see lib/api/appSettings.ts).
--
-- DROP + CREATE: adding an OUT column changes the signature, which
-- CREATE OR REPLACE cannot do.
--
-- Note the fallback is TRUE here, unlike its stricter siblings. For the
-- registration flags an unreadable value must not advertise a laxer flow than
-- the wizard runs. This one is the reverse: failing closed would hide ~1,480
-- listings on a transient read error, which is a far louder failure than
-- briefly showing listings that were already public.
DROP FUNCTION IF EXISTS public.public_feature_flags();

CREATE FUNCTION public.public_feature_flags()
RETURNS TABLE(
  enable_events               BOOLEAN,
  enable_bookings             BOOLEAN,
  require_business_documents  BOOLEAN,
  auto_verify_businesses      BOOLEAN,
  show_admin_seeded_businesses BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.get_app_setting_bool('enable_events', false),
    public.get_app_setting_bool('enable_bookings', false),
    -- Strict fallbacks, matching `getRegistrationSettings`'s own: an
    -- unreadable flag must not advertise a laxer flow than the wizard runs.
    public.get_app_setting_bool('require_business_documents', true),
    public.get_app_setting_bool('auto_verify_businesses', false),
    public.get_app_setting_bool('show_admin_seeded_businesses', true);
$$;

GRANT EXECUTE ON FUNCTION public.public_feature_flags() TO anon, authenticated;
