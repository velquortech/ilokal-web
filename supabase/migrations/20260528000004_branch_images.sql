-- Add branch-specific images: cover photo and gallery
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_images   TEXT[] NOT NULL DEFAULT '{}';

-- Storage bucket for branch images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branch-images', 'branch-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_branch_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'branch-images');

CREATE POLICY "owner_upload_branch_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branch-images');

CREATE POLICY "owner_delete_branch_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branch-images');
