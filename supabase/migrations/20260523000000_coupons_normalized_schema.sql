-- Normalize coupons table to match the application type definitions.
-- The original migration (20260217034520) used a simple schema with title/type/end_date.
-- This migration replaces it with the full schema matching lib/types/coupon.ts.

-- 1. Drop old coupons table (cascades to any foreign keys)
DROP TABLE IF EXISTS public.coupon_redemptions CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;

-- 2. Create normalized coupons table
CREATE TABLE public.coupons (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id              UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code                     TEXT        NOT NULL,
  description              TEXT,
  -- discount stores { type: 'percentage'|'fixed_amount', value: number }
  discount                 JSONB       NOT NULL,
  -- scope controls which products/categories the coupon applies to
  usage_scope              TEXT        NOT NULL DEFAULT 'any'
    CHECK (usage_scope IN ('any', 'specific_categories', 'specific_products')),
  -- array of category_id or product_id UUIDs when scope is not 'any'
  scope_values             UUID[]      DEFAULT NULL,
  start_date               TIMESTAMPTZ NOT NULL,
  expiry_date              TIMESTAMPTZ NOT NULL,
  max_redemptions_global   INTEGER     DEFAULT NULL CHECK (max_redemptions_global > 0),
  max_redemptions_per_user INTEGER     DEFAULT NULL CHECK (max_redemptions_per_user > 0),
  current_redemptions      INTEGER     NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  archived_at              TIMESTAMPTZ DEFAULT NULL,
  -- code is unique per business (case-insensitive enforced at app layer)
  UNIQUE (business_id, code)
);

-- 3. Redemption log — one row per user per coupon use
CREATE TABLE public.coupon_redemptions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id   UUID        NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX idx_coupons_business_id    ON public.coupons (business_id);
CREATE INDEX idx_coupons_expiry_date    ON public.coupons (expiry_date);
CREATE INDEX idx_coupons_archived_at   ON public.coupons (archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_coupon_redemptions_coupon_id ON public.coupon_redemptions (coupon_id);
CREATE INDEX idx_coupon_redemptions_user_id   ON public.coupon_redemptions (user_id);

-- 5. RLS
ALTER TABLE public.coupons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Business owners manage their own coupons
CREATE POLICY "business_owner_manage_coupons"
  ON public.coupons
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can read non-archived coupons from verified businesses
CREATE POLICY "public_read_active_coupons"
  ON public.coupons
  FOR SELECT
  USING (
    archived_at IS NULL
    AND business_id IN (
      SELECT id FROM public.businesses WHERE status = 'verified'
    )
  );

-- Authenticated users can read and write their own redemptions
CREATE POLICY "user_manage_own_redemptions"
  ON public.coupon_redemptions
  FOR ALL
  USING (user_id = auth.uid());

-- Business owners can read redemptions for their coupons
CREATE POLICY "business_owner_read_redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (
    coupon_id IN (
      SELECT c.id FROM public.coupons c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- 6. updated_at trigger
CREATE TRIGGER on_update_coupons
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
