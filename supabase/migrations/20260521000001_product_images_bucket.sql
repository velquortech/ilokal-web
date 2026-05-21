-- Create product-images storage bucket for product catalogue images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated update product images" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND auth.role() = 'authenticated'
  );
