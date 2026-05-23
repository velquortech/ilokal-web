-- Create public storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read product images
CREATE POLICY "Public read access for product images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Allow authenticated business owners to upload product images
CREATE POLICY "Authenticated upload for product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update their own product images
CREATE POLICY "Authenticated update for product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to delete their own product images
CREATE POLICY "Authenticated delete for product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
