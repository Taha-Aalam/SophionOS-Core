-- API keys for programmatic access to the REST API (/api/v1).
-- A raw key is shown to the user exactly once at creation; only its sha256
-- hash is stored here. Key lookup during request auth uses the admin client
-- (service role) because the key IS the auth context — there is no Clerk JWT
-- on an API-key request, so RLS cannot scope the lookup.
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- sha256 hex of the raw key
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can read/manage only their own keys via the authenticated (JWT) path.
-- The admin client bypasses RLS for the key-hash lookup during request auth.
DO $$
BEGIN
  CREATE POLICY "Users can manage their own API keys"
    ON api_keys
    USING (user_id = auth.jwt() ->> 'sub')
    WITH CHECK (user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
