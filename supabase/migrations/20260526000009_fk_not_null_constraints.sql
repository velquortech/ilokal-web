-- SEC-10: Add NOT NULL to critical FK columns.
-- Nullable FKs on core relationship columns allow orphaned rows that bypass
-- ownership checks in RLS policies (e.g., a branch with business_id = NULL
-- is invisible to all ownership policies).
--
-- Run before applying — all must return 0:
--   SELECT COUNT(*) FROM public.branches WHERE business_id IS NULL;
--   SELECT COUNT(*) FROM public.products WHERE business_id IS NULL;
--   SELECT COUNT(*) FROM public.subscriptions WHERE user_id IS NULL OR business_id IS NULL;
--   SELECT COUNT(*) FROM public.user_redemptions WHERE user_id IS NULL OR coupon_id IS NULL;

ALTER TABLE public.branches
  ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE public.products
  ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN user_id     SET NOT NULL,
  ALTER COLUMN business_id SET NOT NULL;

-- coupon_redemptions (normalized table from SEC-12)
ALTER TABLE public.coupon_redemptions
  ALTER COLUMN coupon_id SET NOT NULL,
  ALTER COLUMN user_id   SET NOT NULL;

-- user_redemptions (legacy session table)
ALTER TABLE public.user_redemptions
  ALTER COLUMN user_id   SET NOT NULL,
  ALTER COLUMN coupon_id SET NOT NULL;
