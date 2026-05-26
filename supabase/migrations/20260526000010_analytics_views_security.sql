-- SEC-11: Secure analytics views with security_invoker = true.
-- Previously both views ran with the definer's privileges, meaning any caller
-- (including unauthenticated) who discovered the view name could read all data.
-- security_invoker = true makes the view run under the caller's RLS context:
--   - Business owners see only their own business data (enforced by businesses RLS)
--   - Admin routes use the service-role client which bypasses RLS — unaffected
--
-- Also fixes two pre-existing bugs in business_dashboard_stats:
--   1. b.name → b.shop_name (column was renamed in 20260418094212)
--   2. c.end_date → c.expiry_date (coupons table was normalized in 20260523000000)

-- business_dashboard_stats
DROP VIEW IF EXISTS business_dashboard_stats;

CREATE VIEW business_dashboard_stats
  WITH (security_invoker = true)
AS
SELECT
  b.id        AS business_id,
  b.shop_name AS business_name,

  (SELECT COUNT(*)
   FROM public.subscriptions s
   WHERE s.business_id = b.id
  ) AS total_followers,

  (SELECT COUNT(*)
   FROM public.coupon_redemptions cr
   JOIN public.coupons c ON cr.coupon_id = c.id
   WHERE c.business_id = b.id
  ) AS total_redemptions,

  (SELECT COUNT(*)
   FROM public.coupons c
   WHERE c.business_id = b.id
     AND c.expiry_date > NOW()
     AND c.archived_at IS NULL
  ) AS active_deals

FROM public.businesses b;

-- admin_revenue_analytics
DROP VIEW IF EXISTS admin_revenue_analytics;

CREATE VIEW admin_revenue_analytics
  WITH (security_invoker = true)
AS
SELECT
  DATE_TRUNC('month', p.payment_date)                                  AS month,
  SUM(p.amount)  FILTER (WHERE p.status = 'succeeded')                 AS total_revenue,
  COUNT(*)       FILTER (WHERE p.status = 'succeeded')                 AS successful_payments,
  COUNT(*)       FILTER (WHERE p.status = 'failed')                    AS failed_payments,
  json_object_agg(sp.name, p.amount)                                   AS revenue_by_plan_breakdown
FROM public.payments p
JOIN public.business_subscriptions bs ON p.subscription_id = bs.id
JOIN public.subscription_plans     sp ON bs.plan_id        = sp.id
GROUP BY month
ORDER BY month DESC;
