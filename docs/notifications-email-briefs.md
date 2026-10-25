# Email briefs — operator runbook

How the scheduled briefs (morning briefing, evening review, weekly digest)
work, and how to configure and verify them per environment. Covers both the
deterministic briefs and the optional AI narration (BYOAK).

## Architecture

```
Supabase pg_cron (hourly, '0 * * * *')
  → pg_net POST {app.briefs_cron_url}  (Bearer app.cron_secret)
    → /api/cron/briefs  (timing-safe secret check, maxDuration 60s)
      → runBriefDispatch:
          1. load candidates (user_settings: notifications + preferences.timezone)
          2. due check: local time ≥ configured hour, no delivery today (notification_deliveries)
          3. resolve Clerk primary email
          4. dashboardService.getToday()  → TodayData
          5. optional narration (user's own provider key via llm-gateway)
          6. composeBriefEmail → Resend sendBriefEmail
          7. record delivery (sent/failed/skipped + payload metadata)
```

- Scheduling migration: `supabase/migrations/20261025000002_brief_cron_hourly.sql`
  (reschedules the job from `*/15` to hourly; 1-hour slots with same-day
  catch-up — a missed tick delays the brief by an hour instead of losing the day).
- Dedupe: partial unique index on `(user_id, kind, local_date, channel)` for
  terminal statuses — retries and double-fires are safe.

## Environment configuration

Application env (`.env.local` / hosting provider):

| Var | Purpose |
|---|---|
| `CRON_SECRET` | Bearer secret the cron job must present. Long random string (`openssl rand -hex 32`). |
| `RESEND_API_KEY` | Resend API key used to send the emails. |
| `EMAIL_FROM` | Verified sender, e.g. `SophionOS <briefs@yourdomain.com>`. |
| `PROVIDER_KEY_ENCRYPTION_SECRET` | ≥32 chars; AES-256-GCM key material for stored provider keys. Required before any user can connect a key. Rotating it invalidates stored keys. |
| `SOPHION_DISABLE_BYOAK_LLM` | Optional kill switch: set truthy to disable all user-key LLM egress (narration falls back to deterministic briefs). |

Database GUCs (Supabase → SQL editor, per environment — never in SQL files):

```sql
ALTER DATABASE postgres SET app.briefs_cron_url = 'https://app.example.com/api/cron/briefs';
ALTER DATABASE postgres SET app.cron_secret = 'same-value-as-CRON_SECRET';
```

The `invoke_brief_email_cron()` wrapper (created by the 2026-07-23 migration)
fails soft with a WARNING if either GUC is unset.

## Verifying a deployment

1. Check the job exists: `SELECT jobname, schedule, active FROM cron.job;`
   → `sophionos-brief-email-dispatch`, `0 * * * *`.
2. Trigger a run manually (same path the scheduler uses):

   ```bash
   curl -sX POST https://app.example.com/api/cron/briefs \
     -H "Authorization: Bearer $CRON_SECRET" | jq
   ```

   Response reports `{ candidates, due, sent, skipped, failed, failures }`.
3. Check outcomes: `SELECT kind, local_date, status, payload FROM notification_deliveries ORDER BY created_at DESC LIMIT 10;`
   — `payload.narrated` / `payload.fallback_reason` show whether AI narration ran.

## Testing locally

1. Fill `.env.local`: `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
   (Resend's `onboarding@resend.dev` delivers to your own account email),
   `PROVIDER_KEY_ENCRYPTION_SECRET`. No Supabase GUC needed — curl the route.
2. Connect a provider in Settings → AI Providers, then enable AI summaries
   and set a briefing hour that has already passed today in Settings →
   Notifications.
3. `curl -X POST http://localhost:3000/api/cron/briefs -H "Authorization: Bearer $CRON_SECRET"`.
   Repeat calls are deduped for the same local date.

## Failure semantics

- Narration is **additive only**: no credential, narration disabled, provider
  error, kill switch, or run-deadline pressure → the deterministic brief
  sends and the payload records `narrated: false` with a `fallback_reason`.
- A brief whose send fails is recorded `failed` and retries on the next
  hourly tick (dedupe only blocks terminal `sent`/`skipped` outcomes).
- One user's failure never aborts the run (per-candidate isolation); the
  response still returns 200 with per-candidate outcomes.
