-- The public mobile deals feed (/api/mobile/deals) runs under the anon role and
-- needs to know whether a business holds an active, promoted subscription so it
-- can size the explore bento cards. business_subscriptions previously had no
-- public SELECT policy, so the nested join returned zero rows and is_subscribed
-- was always false.
--
-- This adds a narrowly-scoped public SELECT policy: anon can read ONLY active
-- subscriptions on plans flagged features_promo_boost = TRUE. Canceled/expired
-- subscriptions and non-promoted plans (e.g. Free Tier) stay private. Existing
-- admin/owner policies are permissive and combine with OR, so their access is
-- unchanged. No write policies are touched.
CREATE POLICY "Public can read active promoted subscriptions"
ON public.business_subscriptions FOR SELECT
USING (
  status = 'active'
  AND current_period_end > NOW()
  AND plan_id IN (
    SELECT id FROM public.subscription_plans WHERE features_promo_boost = TRUE
  )
);
