-- Security (SEC-4 / S3): gate review creation on a real interaction.
-- See .claude/PERFORMANCE_AUDIT.md (SEC-4).
--
-- `ratings` and `business_ratings` accepted INSERTs from any authenticated
-- user for any product/business — review-bombing and fake-praise were one
-- PostgREST call away. New rule: a non-admin may only create a rating for a
-- business they have actually redeemed a coupon from (a `user_redemptions`
-- row joined to that business's coupons).
--
-- Mechanics:
--   * `has_redeemed_from_business(p_user, p_business)` is SECURITY DEFINER so
--     the check sees all redemption rows regardless of the caller's RLS view.
--   * The gates are RESTRICTIVE policies — they AND onto the existing
--     permissive self-insert policies without loosening anything else.
--     UPDATEs (editing your own review) and admin/service-role paths are
--     untouched (service role bypasses RLS; admins pass via is_admin()).
--   * Existing rows are unaffected (INSERT-only gate).
--
-- Rollback:
--   DROP POLICY ratings_require_interaction ON public.ratings;
--   DROP POLICY business_ratings_require_interaction ON public.business_ratings;
--   DROP FUNCTION public.has_redeemed_from_business(uuid, uuid);

CREATE OR REPLACE FUNCTION public.has_redeemed_from_business(
  p_user     UUID,
  p_business UUID
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_redemptions ur
    JOIN public.coupons c ON c.id = ur.coupon_id
    WHERE ur.user_id = p_user
      AND c.business_id = p_business
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_redeemed_from_business(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_redeemed_from_business(UUID, UUID)
  TO authenticated, service_role;

CREATE POLICY ratings_require_interaction ON public.ratings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_redeemed_from_business((SELECT auth.uid()), business_id)
  );

CREATE POLICY business_ratings_require_interaction ON public.business_ratings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_redeemed_from_business((SELECT auth.uid()), business_id)
  );
