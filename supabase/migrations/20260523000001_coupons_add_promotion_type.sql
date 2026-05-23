-- Add promotion_type to coupons to distinguish code-based coupons from featured deals.
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS promotion_type TEXT NOT NULL DEFAULT 'coupon'
    CHECK (promotion_type IN ('coupon', 'deal'));
