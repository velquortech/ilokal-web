-- SEC-09: Enforce JSONB structure on coupons.discount column.
-- Without this, any discount shape (including invalid ones) could be saved,
-- causing silent runtime failures in the mobile discount calculation code.
--
-- Run before applying:
--   SELECT id, discount FROM public.coupons
--   WHERE NOT (
--     discount ? 'type'
--     AND discount ? 'value'
--     AND (discount->>'type') IN ('percentage', 'fixed_amount')
--     AND jsonb_typeof(discount->'value') = 'number'
--   );

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_structure CHECK (
    discount ? 'type'
    AND discount ? 'value'
    AND (discount->>'type') IN ('percentage', 'fixed_amount')
    AND jsonb_typeof(discount->'value') = 'number'
  );
