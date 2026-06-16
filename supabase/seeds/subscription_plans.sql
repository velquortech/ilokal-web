-- Seed the base subscription plans.
--
-- Idempotent: `subscription_plans.name` has no UNIQUE constraint and `id` defaults
-- to gen_random_uuid(), so a plain INSERT would add 4 DUPLICATE plans on every
-- re-run (breaking plan selection + the promo-boost deals feed). Insert each plan
-- only when no plan with that name exists yet, so `make seed-cloud` is safe to re-run.
-- `interval` is the public.plan_interval enum, so the VALUES literal is cast explicitly.
INSERT INTO public.subscription_plans (name, description, price, interval, interval_count)
SELECT v.name, v.description, v.price, v.plan_interval::public.plan_interval, v.interval_count
FROM (VALUES
  ('Free Tier',   'One-time trial for new businesses',        0,       'month', 1),
  ('Beta Access', 'Exclusive access for verified businesses', 0,       'month', 3),
  ('Pro Monthly', 'Standard monthly subscription',            999.00,  'month', 1),
  ('Pro Yearly',  'Discounted yearly subscription',           9999.00, 'year',  1)
) AS v(name, description, price, plan_interval, interval_count)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans sp WHERE sp.name = v.name
);
