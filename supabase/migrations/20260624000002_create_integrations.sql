-- External messaging integrations (whatsapp | telegram) linked during the
-- Agent onboarding flow. Backs /api/v1/user/integrations.
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,                      -- whatsapp | telegram
  external_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users manage their own integrations"
    ON integrations
    USING (user_id = auth.jwt() ->> 'sub')
    WITH CHECK (user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
