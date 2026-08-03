# Self-hosting

You are the operator. SophionOS open source does not include managed backups,
24/7 support, or compliance certification.

## Responsibilities

| You own | SophionOS provides |
|---------|-------------------|
| Clerk project & secrets | App code using Clerk |
| Supabase/Postgres & backups | Migrations + RLS |
| TLS, reverse proxy, domains | Host-routing helpers |
| Secret rotation & access control | `.env.example` contract |
| Upgrades & downtime | Release notes / changelog |

## Prerequisites

- Node.js **22+**
- **pnpm** 9+
- Clerk application (development or production)
- Supabase project **or** Supabase CLI for local Postgres
- Ability to set JWT integration so Supabase accepts Clerk tokens (see below)

## 1. Clone and environment

```bash
cp .env.example .env.local
```

Fill placeholders only—never commit real values. Required variables are listed
in `.env.example`.

### Clerk

1. Create an application in Clerk.
2. Set publishable and secret keys in `.env.local`.
3. Configure sign-in/sign-up URLs to match the template (`/login`, `/signup`).
4. Ensure the JWT issued to the app is accepted by Supabase (Clerk Supabase
   integration / JWT template with `sub` = user id). Follow current Clerk +
   Supabase docs for your Clerk version.
5. Add every host the app runs on to Clerk's **Allowed Origins** (Production →
   domains, plus the development allow-list), e.g. `https://dev.sophionos.com`
   and `https://app.sophionos.com` (and the apex if you serve marketing there).
   Host routing is driven by `NEXT_PUBLIC_APP_URL`, so each environment's
   allowed origin must match its configured app URL.

### Supabase

1. Create a project (or `npx supabase start` locally).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Set `SUPABASE_SERVICE_ROLE_KEY` **only** on the server (never `NEXT_PUBLIC_`).
4. Apply migrations:

   ```bash
   # Local
   npx supabase db reset    # applies migrations + seed.sql

   # Hosted: use `supabase db push` or run SQL migrations in order
   ```
5. Supabase GoTrue auth is not used by this app — it authenticates via Clerk,
   so `supabase/config.toml`'s `site_url` / `additional_redirect_urls` are
   local-stack defaults only. For a hosted project, set Site URL and Redirect
   URLs in the Supabase dashboard (Authentication → URL Configuration) to match
   `NEXT_PUBLIC_APP_URL` (e.g. `https://app.sophionos.com`).

## 2. Install and run

```bash
pnpm install
pnpm dev
```

### Host routing

The host the application runs on is decided **solely** by `NEXT_PUBLIC_APP_URL`
(no hardcoded `app.` subdomain prefix). Set it to the exact origin you want the
app served from (no trailing slash), e.g.:

- Dev: `https://dev.sophionos.com` (or `http://localhost:3000` for single-host)
- Prod: `https://app.sophionos.com`

Any other host is treated as the apex/marketing host; app routes hit there are
redirected to the configured app origin. When `NEXT_PUBLIC_APP_URL` is unset the
app runs in single-host mode on the current host. See `src/proxy.ts`.

## 3. Demo / synthetic data

```bash
pnpm seed:demo
```

Uses synthetic personas only (`supabase/seed.sql` / `pnpm seed:demo`). Never seed
real personal data into shared environments.

To reset local DB + seed:

```bash
npx supabase db reset
```

## 4. Tests

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Unit tests use in-memory rate limiting (`RATE_LIMIT_STORE=memory` in CI).

## 5. Docker evaluation path

Multi-stage image builds the Next.js app only (Clerk + Supabase stay external):

```bash
# Build
docker compose build

# Run (pass env from your shell or .env.local)
docker compose up
# Health: container healthcheck hits http://127.0.0.1:3000/
```

Or:

```bash
docker build -t sophionos-app .
docker run --rm -p 3000:3000 --env-file .env.local sophionos-app
```

Demo seed still runs against your Supabase project (`pnpm seed:demo`), not inside
the image by default.

## 6. Production basics

- Terminate TLS at your reverse proxy or platform.
- Restrict who can read service-role and Clerk secrets.
- Schedule Postgres backups and test restore.
- Set strong `BILLING_WEBHOOK_SECRET` only if you enable billing webhooks.
- Review `docs/security-model.md` and `docs/known-limitations.md`.
- Prefer not exposing admin/debug tools publicly.
- Never enable demo mode or default secrets in production.

## 7. Export and deletion

- Export: Settings → Privacy & data, or `GET /api/v1/user/export` /
  `POST /api/v1/user/data-export` while authenticated (session).
- Deletion: in-app account deletion request (grace + finalize) when enabled;
  operators still own Clerk user removal and backup erasure. See
  `docs/privacy-and-data.md`.

## Unsupported claims

Self-hosting does not automatically make the system “air-gapped,” “HIPAA,” or
“enterprise ready.” Those require your architecture and process choices.
