-- Make the contact-avatars bucket publicly readable
UPDATE storage.buckets
SET public = true
WHERE id = 'contact-avatars';

-- Allow authenticated users to upload/overwrite objects in their own folder
DO $$
BEGIN
  CREATE POLICY "Users can upload their own contact avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow public reads (bucket is public but row-level policy is belt-and-suspenders)
DO $$
BEGIN
  CREATE POLICY "Public read for contact avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contact-avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow users to update/replace their own images
DO $$
BEGIN
  CREATE POLICY "Users can update their own contact avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
