-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-docs', 'business-docs', false);

-- 2. Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-docs');

-- 3. Policy: Allow users to view their own files
CREATE POLICY "Allow users to read their own files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'business-docs' AND auth.uid() = owner);

-- 4. Policy: Allow users to delete their own files
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'business-docs' AND auth.uid() = owner);