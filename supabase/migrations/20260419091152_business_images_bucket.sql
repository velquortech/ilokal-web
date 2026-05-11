-- 1. Create/Update public bucket for shop logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Anyone can read logos
DROP POLICY IF EXISTS "Public read access for logos" ON storage.objects;
CREATE POLICY "Public read access for logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'shop-logos');

-- Policy: Authenticated users can upload logos
DROP POLICY IF EXISTS "Authenticated upload for logos" ON storage.objects;
CREATE POLICY "Authenticated upload for logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-logos');


-- 2. Create/Update public bucket for interior images
INSERT INTO storage.buckets (id, name, public)
VALUES ('interior-images', 'interior-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Anyone can read interior images
DROP POLICY IF EXISTS "Public read access for interior images" ON storage.objects;
CREATE POLICY "Public read access for interior images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'interior-images');

-- Policy: Authenticated users can upload interior images
DROP POLICY IF EXISTS "Authenticated upload for interior images" ON storage.objects;
CREATE POLICY "Authenticated upload for interior images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'interior-images');


-- 3. Create/Update public bucket for shop banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-banners', 'shop-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Anyone can read shop banners
DROP POLICY IF EXISTS "Public read access for shop banners" ON storage.objects;
CREATE POLICY "Public read access for shop banners" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'shop-banners');

-- Policy: Authenticated users can upload shop banners
DROP POLICY IF EXISTS "Authenticated upload for shop banners" ON storage.objects;
CREATE POLICY "Authenticated upload for shop banners" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-banners');