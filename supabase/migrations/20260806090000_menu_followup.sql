-- ============================================================================
-- Menu follow-up: the read side + the "nudged" marker.
--
-- Backs the admin surface that lists verified shops which have registered but
-- never given their shop a menu (no live offering), so an admin can email each
-- owner a reminder. Two things ship together because the RPC returns the
-- marker the send path writes:
--
--   1. businesses.menu_reminder_sent_at  — when the last reminder went out.
--   2. admin_businesses_missing_menu(...) — the list, aggregated in SQL.
--
-- HIGH risk by policy: a new SECURITY DEFINER function that reads EVERY shop's
-- owner email, plus a schema column. Applied + red-teamed on LOCAL ONLY. Needs
-- human approval before merge, then `make migrate-cloud` + a ledger reconcile.
-- Additive: the column is nullable with no backfill and no new policy (the
-- existing owner/admin policies cover it; admin writes go through the
-- service-role client anyway), so nothing existing changes behaviour.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The marker.
--
-- Nullable, no default, no backfill: NULL means "never reminded". A
-- `DEFAULT now()` would claim every existing shop had already been nudged.
-- ----------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS menu_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.businesses.menu_reminder_sent_at IS
  'When the last "add your menu" reminder email was sent to the owner. NULL = never. Written only by the admin follow-up send path (service role).';

-- ----------------------------------------------------------------------------
-- 2. The list.
--
-- SECURITY DEFINER because it aggregates across EVERY shop and reads owner
-- emails from profiles — an admin caller has no RLS path to another owner's
-- email. The counts are computed in SQL (EXISTS), never fetched-then-counted
-- in Node, which the PostgREST 1000-row cap would silently truncate.
--
-- "Live menu"  = an active, non-archived product (what a shopper actually
--                sees; an unlisted/disabled/archived catalogue renders empty).
-- "Live promo" = a published, non-archived coupon/deal inside its date window
--                (the coupon-access invariant), covering both promotion types.
--
-- The offering NOUN is resolved the same way the dashboard does: the shop's
-- `offering_mode` picks the branch of its type's `offering_profile`, falling
-- back to "menu"/"listings" when no profile resolves (an unmapped or renamed
-- type), so the email never renders a blank noun.
--
-- EXECUTE is revoked from everyone and granted to service_role only; the
-- calling Server Action verifies admin BEFORE using the service-role client.
-- ----------------------------------------------------------------------------
-- Paginated: the list is fetched one page at a time, never fetched-whole and
-- counted in Node — PostgREST caps at max_rows (1000), so a JS count would
-- silently under-read on a platform whose whole job here is accumulating empty
-- shops. The stat totals come from `admin_businesses_missing_menu_stats`
-- (uncapped COUNT) and "send to all" from `admin_businesses_missing_menu_ids`.
--
-- Signature changed (limit/offset added), so the old 2-arg overload is dropped
-- first — `CREATE OR REPLACE` would leave it as a second overload.
DROP FUNCTION IF EXISTS public.admin_businesses_missing_menu(text, boolean);

CREATE OR REPLACE FUNCTION public.admin_businesses_missing_menu(
  p_search        text    DEFAULT NULL,
  p_only_no_promo boolean DEFAULT false,
  p_limit         integer DEFAULT 50,
  p_offset        integer DEFAULT 0
)
RETURNS TABLE (
  id                    uuid,
  shop_name             text,
  owner_email           text,
  owner_name            text,
  offering_noun         text,
  offering_plural       text,
  has_live_menu         boolean,
  has_live_promo        boolean,
  menu_reminder_sent_at timestamptz,
  created_at            timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    b.id,
    b.shop_name,
    p.email                                             AS owner_email,
    p.full_name                                         AS owner_name,
    COALESCE(
      NULLIF(bt.offering_profile -> b.offering_mode ->> 'catalogue', ''),
      'menu'
    )                                                   AS offering_noun,
    COALESCE(
      NULLIF(bt.offering_profile -> b.offering_mode ->> 'plural', ''),
      'listings'
    )                                                   AS offering_plural,
    EXISTS (
      SELECT 1 FROM public.products pr
      WHERE pr.business_id = b.id
        AND pr.status = 'active'
        AND pr.archived_at IS NULL
    )                                                   AS has_live_menu,
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.business_id = b.id
        AND c.status = 'published'
        AND c.archived_at IS NULL
        AND c.start_date <= now()
        AND c.expiry_date >= now()
    )                                                   AS has_live_promo,
    b.menu_reminder_sent_at,
    b.created_at
  FROM public.businesses b
  JOIN public.profiles p        ON p.id = b.owner_id
  LEFT JOIN public.business_types bt ON bt.id = b.business_type_id
  WHERE b.status = 'verified'
    AND b.archived_at IS NULL
    -- The shop this feature exists for: verified, but nobody can see what it
    -- sells.
    AND NOT EXISTS (
      SELECT 1 FROM public.products pr
      WHERE pr.business_id = b.id
        AND pr.status = 'active'
        AND pr.archived_at IS NULL
    )
    AND (
      p_search IS NULL
      OR b.shop_name ILIKE '%' || p_search || '%'
    )
    AND (
      NOT p_only_no_promo
      OR NOT EXISTS (
        SELECT 1 FROM public.coupons c
        WHERE c.business_id = b.id
          AND c.status = 'published'
          AND c.archived_at IS NULL
          AND c.start_date <= now()
          AND c.expiry_date >= now()
      )
    )
  ORDER BY b.created_at ASC NULLS LAST, b.id ASC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION
  public.admin_businesses_missing_menu(text, boolean, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_businesses_missing_menu(text, boolean, integer, integer)
  TO service_role;

COMMENT ON FUNCTION
  public.admin_businesses_missing_menu(text, boolean, integer, integer) IS
  'Admin-only (service_role): ONE PAGE of verified, non-archived shops with no live offering, with owner email and resolved offering noun. Caller must verify admin before invoking.';

-- ----------------------------------------------------------------------------
-- 3. Stat totals — uncapped COUNTs, so the cards never under-read past 1000.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_businesses_missing_menu_stats(
  p_search        text    DEFAULT NULL,
  p_only_no_promo boolean DEFAULT false
)
RETURNS TABLE (
  total    bigint,
  no_promo bigint,
  reminded bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH missing AS (
    SELECT
      b.id,
      b.menu_reminder_sent_at,
      NOT EXISTS (
        SELECT 1 FROM public.coupons c
        WHERE c.business_id = b.id
          AND c.status = 'published'
          AND c.archived_at IS NULL
          AND c.start_date <= now()
          AND c.expiry_date >= now()
      ) AS no_live_promo
    FROM public.businesses b
    WHERE b.status = 'verified'
      AND b.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.products pr
        WHERE pr.business_id = b.id
          AND pr.status = 'active'
          AND pr.archived_at IS NULL
      )
      AND (p_search IS NULL OR b.shop_name ILIKE '%' || p_search || '%')
      AND (
        NOT p_only_no_promo
        OR NOT EXISTS (
          SELECT 1 FROM public.coupons c
          WHERE c.business_id = b.id
            AND c.status = 'published'
            AND c.archived_at IS NULL
            AND c.start_date <= now()
            AND c.expiry_date >= now()
        )
      )
  )
  SELECT
    count(*)                                     AS total,
    count(*) FILTER (WHERE no_live_promo)        AS no_promo,
    count(*) FILTER (WHERE menu_reminder_sent_at IS NOT NULL) AS reminded
  FROM missing;
$$;

REVOKE ALL ON FUNCTION
  public.admin_businesses_missing_menu_stats(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_businesses_missing_menu_stats(text, boolean)
  TO service_role;

COMMENT ON FUNCTION
  public.admin_businesses_missing_menu_stats(text, boolean) IS
  'Admin-only (service_role): uncapped counts for the menu follow-up stat cards.';

-- ----------------------------------------------------------------------------
-- 4. The id set for "send to all" — a single-row uuid[] (NOT a table), so it is
--    not subject to PostgREST's row cap. Derived server-side so the button
--    never trusts a client-supplied, page-capped list.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_businesses_missing_menu_ids(
  p_search        text    DEFAULT NULL,
  p_only_no_promo boolean DEFAULT false
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(array_agg(b.id ORDER BY b.created_at ASC NULLS LAST, b.id ASC), '{}')
  FROM public.businesses b
  WHERE b.status = 'verified'
    AND b.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.products pr
      WHERE pr.business_id = b.id
        AND pr.status = 'active'
        AND pr.archived_at IS NULL
    )
    AND (p_search IS NULL OR b.shop_name ILIKE '%' || p_search || '%')
    AND (
      NOT p_only_no_promo
      OR NOT EXISTS (
        SELECT 1 FROM public.coupons c
        WHERE c.business_id = b.id
          AND c.status = 'published'
          AND c.archived_at IS NULL
          AND c.start_date <= now()
          AND c.expiry_date >= now()
      )
    );
$$;

REVOKE ALL ON FUNCTION
  public.admin_businesses_missing_menu_ids(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_businesses_missing_menu_ids(text, boolean)
  TO service_role;

COMMENT ON FUNCTION
  public.admin_businesses_missing_menu_ids(text, boolean) IS
  'Admin-only (service_role): all matching shop ids for "send to all", server-derived so the button never trusts a page-capped client list.';
