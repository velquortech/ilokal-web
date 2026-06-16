-- Seed the base subscription plans.
--
-- Idempotent: `subscription_plans.name` has no UNIQUE constraint and `id` defaults
-- to gen_random_uuid(), so a plain INSERT would add 4 DUPLICATE plans on every
-- re-run (breaking plan selection + the promo-boost deals feed). Insert each plan
-- only when no plan with that name exists yet, so `make seed-cloud` is safe to re-run.
-- `interval` is the public.plan_interval enum, so the VALUES literal is cast explicitly.
--
-- `features_promo_boost` is set HERE, not relied on from migration 20260530000002:
-- on a fresh `db reset` migrations run BEFORE seeds, so that migration's UPDATE hits
-- an empty table and the flag stays DEFAULT FALSE. Setting it at insert keeps paid
-- plans (Beta Access + Pro) promo-boosted, which is what powers the Home FEATURED
-- spotlight and the promoted deals feed. Free Tier stays false.
INSERT INTO public.subscription_plans (name, description, price, interval, interval_count, features_promo_boost)
SELECT v.name, v.description, v.price, v.plan_interval::public.plan_interval, v.interval_count, v.features_promo_boost
FROM (VALUES
  ('Free Tier',   'One-time trial for new businesses',        0,       'month', 1, FALSE),
  ('Beta Access', 'Exclusive access for verified businesses', 0,       'month', 3, TRUE),
  ('Pro Monthly', 'Standard monthly subscription',            999.00,  'month', 1, TRUE),
  ('Pro Yearly',  'Discounted yearly subscription',           9999.00, 'year',  1, TRUE)
) AS v(name, description, price, plan_interval, interval_count, features_promo_boost)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans sp WHERE sp.name = v.name
);

-- Idempotent flag reconciliation. The INSERT above only sets features_promo_boost
-- on a *fresh* row; if the plans already existed (e.g. an earlier seed run that
-- predated the flag) their stale FALSE survives and the promoted "featured" deals
-- feed shows nothing. Force the canonical value on every run, keyed by plan name:
-- paid/promoted plans boosted, Free Tier not.
UPDATE public.subscription_plans
SET features_promo_boost = (name IN ('Beta Access', 'Pro Monthly', 'Pro Yearly'));
