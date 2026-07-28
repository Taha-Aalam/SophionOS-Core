-- Brief email dispatcher trigger via pg_cron + pg_net
-- Configure per environment AFTER migrate (see docs/notifications-email-briefs.md):
--   ALTER DATABASE postgres SET app.briefs_cron_url = 'https://app.example.com/api/cron/briefs';
--   ALTER DATABASE postgres SET app.cron_secret = 'your-long-random-secret';
-- Never commit real secrets into this file.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Wrapper: posts to the app. Fail soft if settings missing.
CREATE OR REPLACE FUNCTION public.invoke_brief_email_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_url text;
  secret text;
  request_id bigint;
BEGIN
  target_url := nullif(current_setting('app.briefs_cron_url', true), '');
  secret := nullif(current_setting('app.cron_secret', true), '');

  IF target_url IS NULL OR secret IS NULL THEN
    RAISE WARNING 'invoke_brief_email_cron: app.briefs_cron_url or app.cron_secret not set; skipping';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now())
  ) INTO request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_brief_email_cron() FROM PUBLIC;

-- Unschedule previous job if re-running migration patterns
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'sophionos-brief-email-dispatch';
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $$;

SELECT cron.schedule(
  'sophionos-brief-email-dispatch',
  '*/15 * * * *',
  $$SELECT public.invoke_brief_email_cron();$$
);
