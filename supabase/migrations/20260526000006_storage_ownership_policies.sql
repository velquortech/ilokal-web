-- SEC-07: Enforce per-owner storage policies on all write operations.
-- Previously, any authenticated user could upload/update/delete files in any
-- business bucket regardless of ownership. The fix scopes writes to:
--   avatars        → folder must match auth.uid()
--   business buckets → folder must match a business owned by auth.uid()
-- Public READ policies are unchanged.

-- ============================================================
-- HELPER: ownership check for business-scoped buckets
-- Path convention: <business_uuid>/<filename>
-- We compare as text to avoid a hard cast that would throw on malformed UUIDs.
-- ============================================================

-- ============================================================
-- avatars
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Upload to avatars bucket"    ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Avatars"                  ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Avatars"                  ON storage.objects;

CREATE POLICY "Avatars: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING  (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- business-logos
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Upload to business-logos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Business Logos"               ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Business Logos"               ON storage.objects;

CREATE POLICY "Business logos: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Business logos: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'business-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Business logos: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- ============================================================
-- shop-logos (canonical bucket used by upload route + seed data)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated upload for logos" ON storage.objects;

CREATE POLICY "Shop logos: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Shop logos: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'shop-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Shop logos: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-logos'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- ============================================================
-- business-interior
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Upload to business-interior bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Interior Photos"                  ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Interior Photos"                  ON storage.objects;

CREATE POLICY "Business interior: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-interior'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Business interior: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-interior'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'business-interior'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Business interior: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-interior'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- ============================================================
-- interior-images (canonical bucket used by upload route + seed data)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated upload for interior images" ON storage.objects;

CREATE POLICY "Interior images: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'interior-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Interior images: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'interior-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'interior-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Interior images: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'interior-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- ============================================================
-- shop-banners
-- ============================================================
DROP POLICY IF EXISTS "Authenticated upload for shop banners" ON storage.objects;

CREATE POLICY "Shop banners: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-banners'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Shop banners: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-banners'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'shop-banners'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Shop banners: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-banners'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- ============================================================
-- product-images
-- ============================================================
DROP POLICY IF EXISTS "Authenticated upload for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete for product images" ON storage.objects;

CREATE POLICY "Product images: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Product images: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Product images: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- ============================================================
-- verification-docs
-- ============================================================
DROP POLICY IF EXISTS "Authenticated Upload Verification Docs" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Verification Docs"     ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Verification Docs"     ON storage.objects;

CREATE POLICY "Verification docs: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Verification docs: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Verification docs: owner or admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = auth.uid()
          AND archived_at IS NULL
      )
    )
  );

-- ============================================================
-- business-docs
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated uploads"            ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own files"    ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files"  ON storage.objects;

CREATE POLICY "Business docs: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-docs'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY "Business docs: owner or admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-docs'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = auth.uid()
          AND archived_at IS NULL
      )
    )
  );

CREATE POLICY "Business docs: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-docs'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );
