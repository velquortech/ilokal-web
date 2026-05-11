-- Create business storage buckets for Phase 2: Business Profile Management
-- Includes buckets for logos, interior photos, and verification documents

-- Create business-logos storage bucket
INSERT INTO
  storage.buckets (id, name, public)
VALUES
  ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create business-interior storage bucket
INSERT INTO
  storage.buckets (id, name, public)
VALUES
  ('business-interior', 'business-interior', true)
ON CONFLICT (id) DO NOTHING;

-- Create verification-docs storage bucket (private - only admins and business owners)
INSERT INTO
  storage.buckets (id, name, public)
VALUES
  ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BUSINESS LOGOS BUCKET POLICIES
-- ============================================================================

-- Allow public read access to business logos
CREATE POLICY "Public Read Access on business-logos bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'business-logos');

-- Allow authenticated users to upload business logos
CREATE POLICY "Authenticated Upload to business-logos bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Allow users to update their own business logos
CREATE POLICY "Users Update Own Business Logos" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Allow users to delete their own business logos
CREATE POLICY "Users Delete Own Business Logos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- ============================================================================
-- BUSINESS INTERIOR BUCKET POLICIES
-- ============================================================================

-- Allow public read access to interior photos
CREATE POLICY "Public Read Access on business-interior bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'business-interior');

-- Allow authenticated users to upload interior photos
CREATE POLICY "Authenticated Upload to business-interior bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'business-interior' AND auth.role() = 'authenticated');

-- Allow users to update their own interior photos
CREATE POLICY "Users Update Own Interior Photos" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'business-interior' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'business-interior' AND auth.role() = 'authenticated');

-- Allow users to delete their own interior photos
CREATE POLICY "Users Delete Own Interior Photos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'business-interior' AND auth.role() = 'authenticated');

-- ============================================================================
-- VERIFICATION DOCS BUCKET POLICIES
-- ============================================================================

-- Allow admins to read all verification documents
CREATE POLICY "Admin Read Verification Docs" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Allow authenticated users to upload their own verification documents
CREATE POLICY "Authenticated Upload Verification Docs" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own verification documents
CREATE POLICY "Users Update Own Verification Docs" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own verification documents
CREATE POLICY "Users Delete Own Verification Docs" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
  );
