-- SEC-2026-006: Align contact-avatars storage policies with Clerk JWT sub.
-- Folder convention remains: <clerk_user_id>/<filename>

-- Drop legacy auth.uid()-based policies.
DROP POLICY IF EXISTS "Users can upload their own contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read for contact avatars" ON storage.objects;

-- Ensure bucket stays private.
UPDATE storage.buckets
SET public = false
WHERE id = 'contact-avatars';

CREATE POLICY "contact_avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );

CREATE POLICY "contact_avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  )
  WITH CHECK (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );

CREATE POLICY "contact_avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );

CREATE POLICY "contact_avatars_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
  );
