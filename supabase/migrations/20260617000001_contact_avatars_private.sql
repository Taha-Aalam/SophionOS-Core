-- M4: make the contact-avatars bucket private.
--
-- Avatars were stored as public URLs and the bucket was world-readable
-- (anyone with the URL could view them). Switch to a private bucket with
-- owner-only read, and have the app resolve short-lived signed URLs on read.
--
-- The stored contacts.image_url is normalized from a full public URL to the
-- bare object path (e.g. "<user_id>/<contact_id>.png"). The service signs
-- this path at read time.

-- 1. Flip the bucket to private.
UPDATE storage.buckets
SET public = false
WHERE id = 'contact-avatars';

-- 2. Replace the public-read policy with an owner-only read policy.
DROP POLICY IF EXISTS "Public read for contact avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contact avatars" ON storage.objects;

DO $$
BEGIN
  CREATE POLICY "Users can view their own contact avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contact-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Normalize existing image_url values: strip the public-URL prefix down to
--    the object path. Rows already holding a bare path or NULL are untouched.
UPDATE public.contacts
SET image_url = substring(
  image_url
  FROM position('/storage/v1/object/public/contact-avatars/' in image_url)
       + length('/storage/v1/object/public/contact-avatars/')
)
WHERE image_url LIKE '%/storage/v1/object/public/contact-avatars/%';
