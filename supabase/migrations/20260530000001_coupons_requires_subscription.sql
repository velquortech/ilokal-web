ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS requires_subscription BOOLEAN NOT NULL DEFAULT false;
