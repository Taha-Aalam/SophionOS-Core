-- Brief dispatch cadence: 15-minute window matching replaced by 1-hour slots
-- with same-day catch-up (see docs/specs/SPEC-brief-narration.md). The tick
-- now runs hourly; the app decides due-ness per user's local configured hour.

-- Unschedule the previous cadence if present (re-run safe).
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
  '0 * * * *',
  $$SELECT public.invoke_brief_email_cron();$$
);
