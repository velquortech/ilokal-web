-- Push the mobile /deals feed's classification + pagination into the DB.
--
-- WHY: `app/api/mobile/deals/route.ts` fetched up to MAX_DEALS_SCAN (500) coupon
-- rows with nested business/subscription joins on EVERY request, then did the
-- whole pipeline in Node — map → category filter → flash/explore split →
-- featured pick → is_subscribed sort → slice. That's CPU + a large join payload
-- per request, paid by every concurrent user, and the page bound never reached
-- the database (the deals tech-debt "approach B").
--
-- This RPC computes featured / flash / explore entirely in SQL and returns a
-- single JSONB matching the route's response shape, with `.range()`-equivalent
-- OFFSET/LIMIT on the explore page — so the DB returns only (1 featured +
-- flash + per_page) rows instead of 500, and Node does no filtering/sorting.
--
-- Image fields carry RAW storage paths; the Node route resolves them to public
-- URLs via resolveStorageUrl (keeps the env-specific storage base in app code,
-- matching the nearby route convention — see app/api/mobile/businesses/nearby).
--
-- SECURITY DEFINER (like nearby_businesses): it only READS already-public data
-- (published, live, non-archived deals) through filter params — no writes, no
-- privilege escalation — so anon/authenticated EXECUTE is safe.

-- Supporting index for the live-feed filter + popularity ordering.
CREATE INDEX IF NOT EXISTS idx_coupons_live_feed
  ON public.coupons (status, expiry_date, current_redemptions DESC)
  WHERE archived_at IS NULL;

-- Earlier revisions used a 13-arg `mobile_deal_json(...)` helper; the deal object
-- is now built once as a `deal_json` column inside the candidates CTE (no
-- positional-arg transposition risk), so drop the helper if a prior run created it.
DROP FUNCTION IF EXISTS public.mobile_deal_json(
  UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT, INT, BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.mobile_deals(
  p_category  TEXT DEFAULT 'All',
  p_search    TEXT DEFAULT '',
  p_page      INT  DEFAULT 1,
  p_per_page  INT  DEFAULT 20
) RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH params AS (
  SELECT
    now()                                            AS v_now,
    now() + INTERVAL '7 days'                         AS v_flash_cutoff,
    GREATEST(COALESCE(p_page, 1), 1)                  AS v_page,
    LEAST(GREATEST(COALESCE(p_per_page, 20), 1), 50)  AS v_per_page,
    NULLIF(btrim(COALESCE(p_search, '')), '')         AS v_search,
    CASE p_category
      WHEN 'Food'     THEN 'Food & Beverage'
      WHEN 'Retail'   THEN 'Retail'
      WHEN 'Services' THEN 'Services'
      WHEN 'Tourism'  THEN 'Tourism & Leisure'
      ELSE NULL
    END                                               AS v_type
),
-- Raw rows + the two derived scalars (is_subscribed, is_flash). Kept separate
-- from the JSON projection below so EXISTS is evaluated exactly once per row.
candidates_raw AS (
  SELECT
    c.id,
    c.code,
    c.description,
    c.discount,
    c.expiry_date,
    c.promotion_type,
    c.current_redemptions,
    CASE WHEN c.max_redemptions_global IS NOT NULL
         THEN GREATEST(0, c.max_redemptions_global - c.current_redemptions)
         ELSE NULL END             AS slots_remaining,
    biz.id                          AS business_id,
    biz.shop_name                   AS business_name,
    biz.logo_url                    AS business_logo_url,
    biz.interior_images[1]          AS business_image_url,
    bt.name                         AS business_category,
    EXISTS (
      SELECT 1
      FROM public.business_subscriptions bs
      JOIN public.subscription_plans sp ON sp.id = bs.plan_id
      WHERE bs.business_id = biz.id
        AND bs.status = 'active'
        AND bs.current_period_end > p.v_now
        AND sp.features_promo_boost = TRUE
    )                               AS is_subscribed,
    (c.expiry_date <= p.v_flash_cutoff) AS is_flash
  FROM public.coupons c
  CROSS JOIN params p
  JOIN public.businesses biz             ON biz.id = c.business_id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt      ON bt.id = bc.business_type_id
  WHERE c.status = 'published'
    AND c.archived_at IS NULL
    AND c.start_date  <= p.v_now
    AND c.expiry_date >= p.v_now
    AND (
      p.v_search IS NULL
      OR c.description ILIKE '%' || p.v_search || '%'
      OR c.code        ILIKE '%' || p.v_search || '%'
      OR biz.shop_name ILIKE '%' || p.v_search || '%'
    )
    AND (
      p_category = 'All'
      OR (p.v_type IS NOT NULL AND bt.name = p.v_type)
    )
),
-- Build the deal object exactly as the route returns it (logo/image = RAW
-- paths; the route resolves them). Built once here so the ordering columns and
-- the projection can't drift, and there are no positional args to transpose.
candidates AS (
  SELECT
    id,
    current_redemptions,
    expiry_date,
    is_flash,
    is_subscribed,
    jsonb_build_object(
      'id',                 id,
      'code',               code,
      'description',        description,
      'discount',           discount,
      'expiry_date',        expiry_date,
      'promotion_type',     promotion_type,
      'slots_remaining',    slots_remaining,
      'is_subscribed',      is_subscribed,
      'business_id',        business_id,
      'business_name',      business_name,
      'business_logo_url',  business_logo_url,
      'business_image_url', business_image_url,
      'business_category',  business_category
    ) AS deal_json
  FROM candidates_raw
),
-- Featured = most-redeemed non-flash deal; falls back to the best flash deal
-- when there are no non-flash deals (is_flash ASC puts non-flash first). `id`
-- is the final tiebreaker so the pick is deterministic across requests.
featured AS (
  SELECT * FROM candidates
  ORDER BY is_flash ASC, current_redemptions DESC, expiry_date ASC, id ASC
  LIMIT 1
),
flash AS (
  SELECT * FROM candidates
  WHERE is_flash AND id NOT IN (SELECT id FROM featured)
),
explore_all AS (
  SELECT * FROM candidates
  WHERE NOT is_flash AND id NOT IN (SELECT id FROM featured)
),
-- `id` final tiebreaker: without it, rows tying on (is_subscribed,
-- current_redemptions, expiry_date) — common at cold start where everything is
-- 0 redemptions — order non-deterministically, so OFFSET/LIMIT could repeat or
-- skip a deal across separate page requests as the user scrolls.
explore_page AS (
  SELECT * FROM explore_all
  ORDER BY is_subscribed DESC, current_redemptions DESC, expiry_date ASC, id ASC
  OFFSET (SELECT (v_page - 1) * v_per_page FROM params)
  LIMIT  (SELECT v_per_page FROM params)
),
totals AS (
  SELECT count(*)::int AS explore_total FROM explore_all
)
SELECT jsonb_build_object(
  'featured', (SELECT deal_json FROM featured),
  'flash', COALESCE(
    (SELECT jsonb_agg(deal_json ORDER BY current_redemptions DESC, expiry_date ASC, id ASC)
     FROM flash),
    '[]'::jsonb
  ),
  'explore', COALESCE(
    (SELECT jsonb_agg(deal_json ORDER BY is_subscribed DESC, current_redemptions DESC, expiry_date ASC, id ASC)
     FROM explore_page),
    '[]'::jsonb
  ),
  'explore_total',    (SELECT explore_total FROM totals),
  'explore_page',     (SELECT v_page FROM params),
  'explore_per_page', (SELECT v_per_page FROM params),
  'explore_has_more',
    (SELECT v_page * v_per_page FROM params) < (SELECT explore_total FROM totals)
);
$$;

REVOKE EXECUTE ON FUNCTION public.mobile_deals(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mobile_deals(TEXT, TEXT, INT, INT) TO anon, authenticated;
