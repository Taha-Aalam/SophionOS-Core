-- Trust controls: expand api_keys metadata + lightweight audit_events.
-- Raw keys remain never stored (key_hash only). UI uses key_prefix for recognition.

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_prefix text,
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'read_only',
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_used_user_agent text,
  ADD COLUMN IF NOT EXISTS last_used_ip_hash text,
  ADD COLUMN IF NOT EXISTS revoke_reason text;

-- Existing rows: keep prior behavior as write_enabled until users re-key;
-- new MCP/default keys are created as read_only in application code.
UPDATE public.api_keys
SET access_mode = 'write_enabled'
WHERE access_mode = 'read_only'
  AND created_at < now()
  AND key_prefix IS NULL;

DO $$
BEGIN
  ALTER TABLE public.api_keys
    ADD CONSTRAINT api_keys_access_mode_check
    CHECK (access_mode IN ('read_only', 'write_limited', 'write_enabled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.api_keys
    ADD CONSTRAINT api_keys_client_type_check
    CHECK (client_type IN ('mcp', 'automation', 'personal', 'unknown'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Minimal audit log for credential / AI-access events (no note bodies).
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  actor_type text NOT NULL DEFAULT 'user',
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  target_count integer,
  request_id text,
  client_name text,
  client_type text,
  ip_hash text,
  user_agent_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_user_time_idx
  ON public.audit_events (clerk_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_key_time_idx
  ON public.audit_events (api_key_id, occurred_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can read their own audit events"
    ON public.audit_events
    FOR SELECT
    USING (clerk_user_id = auth.jwt() ->> 'sub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
