# Email briefs (Supabase pg_cron + Resend)

SophionOS sends morning briefings, evening reviews, and weekly digests by email when users configure **Settings → Notifications**. Delivery is triggered by Supabase **pg_cron** (every 15 minutes) via **pg_net** HTTP POST to the Next.js route `/api/cron/briefs`. The app resolves the recipient from Clerk, composes a **template** brief (no LLM), and records outcomes in `notification_deliveries`.

## Architecture

```text
pg_cron (*/15 * * * *)
  → public.invoke_brief_email_cron()
    → net.http_post(BRIEFS_CRON_URL, Authorization: Bearer CRON_SECRET)
      → POST /api/cron/briefs
        → load user_settings (notifications + preferences.timezone)
        → match 15-minute local window
        → skip if terminal delivery exists
        → compose template email from dashboard “today”
        → Resend → record notification_deliveries
```

## Prerequisites

1. Hosted app with env vars set (see below).
2. Resend account + verified sending domain DNS.
3. Supabase project with ability to enable **pg_cron** and **pg_net**.

## App environment variables

Set on the Next.js host (Vercel, etc.):

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Shared secret; must match the Bearer value pg_net sends |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender, e.g. `SophionOS <briefs@yourdomain.com>` |
| `BRIEFS_CRON_URL` | Documented public URL (for operators); same value as DB GUC |
| `NEXT_PUBLIC_APP_URL` | Base URL for dashboard CTA links |
| `CLERK_SECRET_KEY` | Resolve primary email for each user |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role access for settings + delivery log |

## Database setup

### 1. Apply migrations

```bash
# Local / CI
supabase db push
# or apply files under supabase/migrations/
# 20260723000000_notification_deliveries.sql
# 20260723000001_brief_email_pg_cron.sql
```

### 2. Enable extensions (if migration fails on hosted Supabase)

Dashboard → **Database → Extensions**:

- `pg_cron`
- `pg_net` (often under schema `extensions`)

Re-run the pg_cron migration SQL from the SQL editor if needed.

### 3. Configure URL + secret (no secrets in SQL files)

**Option A — database GUCs** (names used by `invoke_brief_email_cron`):

```sql
-- Use your real app URL and the same secret as CRON_SECRET on the host.
ALTER DATABASE postgres SET app.briefs_cron_url = 'https://app.example.com/api/cron/briefs';
ALTER DATABASE postgres SET app.cron_secret = 'replace-with-long-random-secret';
```

On some Supabase plans, custom GUCs need superuser or a Dashboard SQL path with elevated privileges. If `ALTER DATABASE ... SET` is blocked, use Vault or a private config table readable only by the security definer owner (see fallback below).

**Option B — Supabase Vault**

Store `briefs_cron_url` and `cron_secret` in Vault and adapt `invoke_brief_email_cron` to read `vault.decrypted_secrets` (operator change; keep secrets out of git).

After changing GUCs, new sessions pick them up; you may need to reconnect or restart connections.

### 4. Confirm the schedule

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'sophionos-brief-email-dispatch';
```

Expected schedule: `*/15 * * * *`.

## Manual invoke

```sql
SELECT public.invoke_brief_email_cron();
```

If URL/secret are missing, the function **soft-fails** with a WARNING and returns (no HTTP call).

### Check pg_net responses

```sql
SELECT id, status_code, content, created
FROM net._http_response
ORDER BY created DESC
LIMIT 20;
```

Expect `status_code` 200 from `/api/cron/briefs` when authorized.

### Check deliveries

```sql
SELECT user_id, kind, local_date, channel, status, error, created_at
FROM public.notification_deliveries
ORDER BY created_at DESC
LIMIT 50;
```

## Resend

1. Create an API key; set `RESEND_API_KEY`.
2. Verify domain DNS (SPF/DKIM) for `EMAIL_FROM`.
3. Send a test from Resend dashboard, then wait for a user in an active 15-minute window.

## Product rules (operators)

- Window is **strict**: configured local time `T` is due only in `[T, T+15)`.
- Missed windows are **not** catch-up sent later the same day.
- Weekly digest: **09:00 local** on `weekly_digest_day` (0=Sunday … 6=Saturday) when day is non-null.
- Email opt-in: `email_enabled !== false` (default on).
- Timezone: `preferences.timezone` IANA string; missing → `UTC`.
- Task lists in the email body use dashboard `getToday` date bounds (server “today” for v1); document to users if needed.

## Disable the job

```sql
SELECT cron.unschedule('sophionos-brief-email-dispatch');
-- or by jobid:
-- SELECT cron.unschedule(<jobid>);
```

## Security notes

- Never commit real `CRON_SECRET` or Resend keys.
- JWT users can only **SELECT** their own `notification_deliveries` rows; writes are service-role only.
- Cron route accepts `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
