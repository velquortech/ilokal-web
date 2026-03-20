-- Create avatars storage bucket
INSERT INTO
  storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read avatars
CREATE POLICY "Public Read Access on avatars bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Authenticated Upload to avatars bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to update their own avatars
CREATE POLICY "Users Update Own Avatars" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to delete their own avatars
CREATE POLICY "Users Delete Own Avatars" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
