-- ============================================================================
-- Menu follow-up: the single-shop send-time re-check.
--
-- The list RPC (20260806090000) answers "which shops need a nudge" for the
-- table. The SEND is a separate, later click, and between the two an owner may
-- add a menu — so the send path must re-verify ONE shop at the moment it acts,
-- exactly like the coupon redeem route re-checks eligibility rather than
-- trusting the list it came from.
--
-- Returns the shop's send-relevant fields for ANY id (even a non-eligible one)
-- so the action can produce a precise skip reason (already has a menu, not
-- verified, no email) instead of a blank refusal. `is_sendable` folds the
-- eligibility rule into one boolean.
--
-- SECURITY DEFINER + service_role only, mirroring the list RPC: it reads owner
-- email, which no RLS-scoped client may. HIGH risk by policy. Applied +
-- red-teamed on LOCAL ONLY — needs approval + `make migrate-cloud` + a ledger
-- reconcile.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_business_followup_target(
  p_business_id uuid
)
RETURNS TABLE (
  shop_name             text,
  owner_email           text,
  owner_name            text,
  offering_noun         text,
  offering_plural       text,
  has_live_menu         boolean,
  menu_reminder_sent_at timestamptz,
  is_sendable           boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    b.shop_name,
    p.email      AS owner_email,
    p.full_name  AS owner_name,
    COALESCE(
      NULLIF(bt.offering_profile -> b.offering_mode ->> 'catalogue', ''),
      'menu'
    )            AS offering_noun,
    COALESCE(
      NULLIF(bt.offering_profile -> b.offering_mode ->> 'plural', ''),
      'listings'
    )            AS offering_plural,
    EXISTS (
      SELECT 1 FROM public.products pr
      WHERE pr.business_id = b.id
        AND pr.status = 'active'
        AND pr.archived_at IS NULL
    )            AS has_live_menu,
    b.menu_reminder_sent_at,
    (
      b.status = 'verified'
      AND b.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.products pr
        WHERE pr.business_id = b.id
          AND pr.status = 'active'
          AND pr.archived_at IS NULL
      )
    )            AS is_sendable
  FROM public.businesses b
  JOIN public.profiles p        ON p.id = b.owner_id
  LEFT JOIN public.business_types bt ON bt.id = b.business_type_id
  WHERE b.id = p_business_id;
$$;

REVOKE ALL ON FUNCTION public.admin_business_followup_target(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_business_followup_target(uuid)
  TO service_role;

COMMENT ON FUNCTION public.admin_business_followup_target(uuid) IS
  'Admin-only (service_role): one shop''s send-time fields for the menu follow-up. is_sendable = verified, non-archived, no live menu. Caller must verify admin first.';
