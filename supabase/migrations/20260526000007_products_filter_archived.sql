-- SEC-08: Filter soft-deleted products from public SELECT.
-- The previous policy only filtered businesses by archived_at but not products
-- themselves, so archived products were still visible to the public and mobile API.

DROP POLICY IF EXISTS "Public view products of verified businesses" ON public.products;

CREATE POLICY "Public view products of verified businesses"
  ON public.products FOR SELECT
  USING (
    products.archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = products.business_id
        AND status = 'verified'
        AND archived_at IS NULL
    )
  );
