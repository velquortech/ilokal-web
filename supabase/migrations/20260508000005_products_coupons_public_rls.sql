-- The products_and_coupons migration enabled RLS but omitted the actual policies.
-- Add the public read policies so mobile clients can access them without auth.

CREATE POLICY "Public view products of verified businesses"
ON public.products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = products.business_id AND status = 'verified' AND archived_at IS NULL
  )
);

CREATE POLICY "Owners manage own products"
ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = products.business_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Public view coupons of verified businesses"
ON public.coupons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = coupons.business_id AND status = 'verified' AND archived_at IS NULL
  )
);

CREATE POLICY "Owners manage own coupons"
ON public.coupons FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = coupons.business_id AND owner_id = auth.uid()
  )
);
