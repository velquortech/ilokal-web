-- ============================================================
-- Public business info — operating hours, contact, social links
-- (.claude/EXPLORE_BUSINESS_INFO.md — EB1)
-- ------------------------------------------------------------
-- `business_settings` is owner-only: its single policy is
-- "Owner manages own business settings" FOR ALL. The public shop page
-- therefore reads NOTHING from it today — not an error, just silently empty
-- sections, which reads as "this shop has no hours".
--
-- Opened up via an RPC rather than a public SELECT policy ON PURPOSE. The
-- table also holds `allow_reviews` and `coupon_default_expiry_days`, which are
-- internal configuration with no business being public. A broad
-- `USING (true)` read is exactly the mistake that leaked the entire follow
-- graph to anon (20260607000000, dropped in 20260608000001). Here the returned
-- column list IS the contract — the function cannot over-expose, and a future
-- column added to the table is private by default.
--
-- Same shape as the other public aggregate RPCs (`get_follower_counts`,
-- `get_business_rating_summary`).
--
-- Rollback: DROP FUNCTION. No data change, no policy change.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_business_public_info(p_business_id UUID)
RETURNS TABLE (
  operating_hours      JSONB,
  social_links         JSONB,
  contact_website      TEXT,
  contact_phone_public TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    bs.operating_hours,
    bs.social_links,
    bs.contact_website,
    bs.contact_phone_public
  FROM public.business_settings bs
  JOIN public.businesses b ON b.id = bs.business_id
  WHERE bs.business_id = p_business_id
    -- The visibility gate the public profile query already applies. Without
    -- it, an unverified or soft-deleted shop's phone number stays reachable
    -- by id even though the shop itself 404s.
    AND b.status = 'verified'
    AND b.archived_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_business_public_info(UUID) IS
  'Public subset of business_settings for the explore shop page. Deliberately '
  'omits allow_reviews and coupon_default_expiry_days. Returns no row for an '
  'unverified or archived business.';

REVOKE ALL ON FUNCTION public.get_business_public_info(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_public_info(UUID)
  TO anon, authenticated;
