-- The 20260523000000 normalization migration dropped the old coupons table with
-- CASCADE, which silently removed the FK from user_redemptions.coupon_id to
-- coupons.id. The new coupons table was created in the same migration but the FK
-- was not re-added, breaking PostgREST nested selects (coupons(...)) on
-- user_redemptions — the mobile redemptions GET endpoint returned 500 as a result.

ALTER TABLE public.user_redemptions
  ADD CONSTRAINT user_redemptions_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;
