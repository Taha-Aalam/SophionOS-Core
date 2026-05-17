-- Create contact-avatars storage bucket (public for read, authenticated for write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-avatars',
  'contact-avatars',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/update/delete their own files
CREATE POLICY "Users can upload their own contact avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contact-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own contact avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contact-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own contact avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contact-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read for all contact avatar files
CREATE POLICY "Anyone can view contact avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-avatars');
