-- ============================================================
-- coupons.discount: add BOGO + FREE promo types
-- ------------------------------------------------------------
-- `discount` is JSONB and until now carried only
--   { type: 'percentage',  value: number }   (0 < value <= 100)
--   { type: 'fixed_amount', value: number }  (value > 0, ₱)
-- with the shape pinned by `coupons_discount_structure` (20260526000008).
-- That constraint REQUIRES a numeric `value` and allows only
-- percentage/fixed_amount, so it must be REPLACED — a bogo/free row would
-- otherwise violate it. This migration drops it and adds a widened CHECK
-- that pins the four-arm union:
--
--   { type: 'percentage',  value: number }        unchanged
--   { type: 'fixed_amount', value: number }       unchanged
--   { type: 'free', value: null }                 a free-anything promo
--   { type: 'bogo', buy: int, get: int,           "Buy 1 Get 1"
--     max_free?: int, value: null }
--
-- No column changes, no RPC changes: `mobile_deals` projects `c.discount`
-- as raw jsonb and the mobile routes pass it through untouched, so old
-- clients keep reading the two shapes they know and new ones get the wider
-- union. The constraint uses `jsonb_typeof` guards (and CASE WHEN) so a
-- missing key evaluates to NULL → arm false, never a cast error.
--
-- Existing rows are all percentage/fixed_amount with a numeric `value`
-- (`value` >= 0 is allowed here so the ALTER cannot fail on a legacy row
-- with a 0 discount; the app layer already requires > 0), so the ADD
-- CONSTRAINT validates in place without a backfill.
--
-- Rollback:
--   ALTER TABLE public.coupons DROP CONSTRAINT coupons_discount_shape_check;
--   ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_structure CHECK (
--     discount ? 'type'
--     AND discount ? 'value'
--     AND (discount->>'type') IN ('percentage', 'fixed_amount')
--     AND jsonb_typeof(discount->'value') = 'number'
--   );
-- ============================================================

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_discount_structure;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_shape_check CHECK (
    discount->>'type' IN ('percentage', 'fixed_amount', 'free', 'bogo')
    AND (
      (
        discount->>'type' IN ('percentage', 'fixed_amount')
        AND jsonb_typeof(discount->'value') = 'number'
        AND (CASE WHEN jsonb_typeof(discount->'value') = 'number'
                  THEN (discount->>'value')::numeric END) >= 0
        AND (discount->>'type' <> 'percentage'
             OR (CASE WHEN jsonb_typeof(discount->'value') = 'number'
                      THEN (discount->>'value')::numeric END) <= 100)
      )
      OR (
        discount->>'type' = 'free'
        AND jsonb_typeof(discount->'value') = 'null'
      )
      OR (
        discount->>'type' = 'bogo'
        AND jsonb_typeof(discount->'buy') = 'number'
        AND jsonb_typeof(discount->'get') = 'number'
        AND (CASE WHEN jsonb_typeof(discount->'buy') = 'number'
                  THEN (discount->>'buy')::numeric END) >= 1
        AND (CASE WHEN jsonb_typeof(discount->'get') = 'number'
                  THEN (discount->>'get')::numeric END) >= 1
      )
    )
  );

COMMENT ON CONSTRAINT coupons_discount_shape_check ON public.coupons IS
  'Stored discount union: {percentage, value 0..100} | {fixed_amount, value > 0} '
  '| {free, value null} | {bogo, buy >= 1, get >= 1, max_free?}. Replaces '
  'coupons_discount_structure (20260526000008). Kept in sync with DiscountValue '
  'in lib/types/coupon.ts and discountValueSchema in lib/validation/coupons.ts '
  '— widen all three together.';
