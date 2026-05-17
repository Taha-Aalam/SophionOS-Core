-- Add image_url to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create contact_logs table
CREATE TABLE IF NOT EXISTS contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_logs_contact_id ON contact_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_user_id ON contact_logs(user_id);

ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contact logs"
  ON contact_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
