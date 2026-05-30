-- Mark which subscription plans grant promotional placement in the mobile explore feed.
-- Free Tier is excluded; Beta Access and all paid plans are included.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS features_promo_boost BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.subscription_plans
  SET features_promo_boost = TRUE
  WHERE name IN ('Beta Access', 'Pro Monthly', 'Pro Yearly');
