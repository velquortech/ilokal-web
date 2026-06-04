-- Dev seed: business subscriptions for 3 of the 5 seed businesses
-- Depends on: businesses.sql, subscription_plans.sql
-- 3 businesses on paid plans (Pro Monthly / Pro Yearly) → is_subscribed = true in the deals API
-- 2 businesses left free (no subscription row) → is_subscribed = false

INSERT INTO public.business_subscriptions
  (business_id, plan_id, status, current_period_start, current_period_end)
VALUES
  -- The Artisan Roastery → Pro Monthly
  (
    '11111111-1111-1111-1111-111111111101',
    (SELECT id FROM public.subscription_plans WHERE name = 'Pro Monthly' LIMIT 1),
    'active',
    NOW(),
    NOW() + INTERVAL '1 month'
  ),
  -- Flora & Flour Bakery → Pro Yearly
  (
    '11111111-1111-1111-1111-111111111102',
    (SELECT id FROM public.subscription_plans WHERE name = 'Pro Yearly' LIMIT 1),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
  ),
  -- Aura Hair Studio → Pro Monthly
  (
    '11111111-1111-1111-1111-111111111104',
    (SELECT id FROM public.subscription_plans WHERE name = 'Pro Monthly' LIMIT 1),
    'active',
    NOW(),
    NOW() + INTERVAL '1 month'
  )
-- The Handy Corner (1103) and Luna & Leaf Bistro (1105) have no subscription row → free tier
ON CONFLICT DO NOTHING;
