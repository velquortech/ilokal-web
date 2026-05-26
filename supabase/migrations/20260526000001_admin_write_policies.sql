-- SEC-02: Add admin write policies to payments, business_subscriptions,
-- user_redemptions, and subscriptions.
-- Previously admins had SELECT-only on payments/business_subscriptions
-- and NO access at all to user_redemptions/subscriptions.

-- payments
DROP POLICY IF EXISTS "Admins manage all payments" ON public.payments;
CREATE POLICY "Admins manage all payments"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- business_subscriptions
DROP POLICY IF EXISTS "Admins manage all business subscriptions" ON public.business_subscriptions;
CREATE POLICY "Admins manage all business subscriptions"
  ON public.business_subscriptions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- user_redemptions (no admin policy existed at all)
DROP POLICY IF EXISTS "Admins manage all redemptions" ON public.user_redemptions;
CREATE POLICY "Admins manage all redemptions"
  ON public.user_redemptions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- subscriptions / user follows (no admin policy existed at all)
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
