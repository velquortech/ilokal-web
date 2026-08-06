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
CREATE OR REPLACE FUNCTION public.admin_businesses_missing_menu(
  p_search       text    DEFAULT NULL,
  p_only_no_promo boolean DEFAULT false
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
  ORDER BY b.created_at ASC NULLS LAST, b.id ASC;
$$;

REVOKE ALL ON FUNCTION public.admin_businesses_missing_menu(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_businesses_missing_menu(text, boolean)
  TO service_role;

COMMENT ON FUNCTION public.admin_businesses_missing_menu(text, boolean) IS
  'Admin-only (service_role): verified, non-archived shops with no live offering, with owner email and resolved offering noun. Caller must verify admin before invoking.';
