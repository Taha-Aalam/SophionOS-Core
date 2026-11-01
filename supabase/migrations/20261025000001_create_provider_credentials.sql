-- provider_credentials: user-connected LLM provider API keys (BYOAK), encrypted at rest.
-- Raw keys are never stored unencrypted: encrypted_secret holds the secret-box
-- AES-256-GCM payload (v1:iv:tag:ciphertext). Validation/management happens in
-- app code against src/lib/ai/provider-registry.ts — the provider column is
-- intentionally free of a CHECK list so new providers need no migration.

CREATE TABLE IF NOT EXISTS public.provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  provider text NOT NULL,
  auth_method text NOT NULL DEFAULT 'api_key'
    CHECK (auth_method IN ('api_key')),
  encrypted_secret text NOT NULL,
  hint text,
  label text,
  base_url text,
  model text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invalid')),
  last_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One credential per user per provider; re-connecting upserts the row.
CREATE UNIQUE INDEX IF NOT EXISTS provider_credentials_user_provider_uidx
  ON public.provider_credentials (user_id, provider);

CREATE INDEX IF NOT EXISTS provider_credentials_user_idx
  ON public.provider_credentials (user_id);

ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users read own provider credentials"
    ON public.provider_credentials
    FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');

  CREATE POLICY "Users insert own provider credentials"
    ON public.provider_credentials
    FOR INSERT
    WITH CHECK (user_id = auth.jwt() ->> 'sub');

  CREATE POLICY "Users update own provider credentials"
    ON public.provider_credentials
    FOR UPDATE
    USING (user_id = auth.jwt() ->> 'sub')
    WITH CHECK (user_id = auth.jwt() ->> 'sub');

  CREATE POLICY "Users delete own provider credentials"
    ON public.provider_credentials
    FOR DELETE
    USING (user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- No service-role policies needed: admin clients bypass RLS. Encrypted secrets
-- are only decrypted server-side (src/lib/services/provider-credentials.service.ts).
