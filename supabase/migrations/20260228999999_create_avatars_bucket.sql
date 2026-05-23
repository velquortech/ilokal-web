-- Create avatars storage bucket
INSERT INTO
  storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read avatars
DROP POLICY IF EXISTS "Public Read Access on avatars bucket" ON storage.objects;
CREATE POLICY "Public Read Access on avatars bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars bucket
DROP POLICY IF EXISTS "Authenticated Upload to avatars bucket" ON storage.objects;
CREATE POLICY "Authenticated Upload to avatars bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to update their own avatars
DROP POLICY IF EXISTS "Users Update Own Avatars" ON storage.objects;
CREATE POLICY "Users Update Own Avatars" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users Delete Own Avatars" ON storage.objects;
CREATE POLICY "Users Delete Own Avatars" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
