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

## 2. Install and run

```bash
pnpm install
pnpm dev
```

### Host routing

`NEXT_PUBLIC_APP_URL` should be the **app** origin (no trailing slash), e.g.:

- Dev: `http://app.localhost:3000`
- Prod: `https://app.example.com`

Apex hosts may serve marketing and redirect app routes—see `src/proxy.ts`.

## 3. Demo / synthetic data

```bash
pnpm seed:demo
```

Uses synthetic personas only (`docs/demo-users/`). Never seed real personal data
into shared environments.

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

## 5. Production basics

- Terminate TLS at your reverse proxy or platform.
- Restrict who can read service-role and Clerk secrets.
- Schedule Postgres backups and test restore.
- Set strong `BILLING_WEBHOOK_SECRET` only if you enable billing webhooks.
- Review `docs/security-model.md` and `docs/known-limitations.md`.
- Prefer not exposing admin/debug tools publicly.

## 6. Export and deletion

- Export: `GET /api/v1/user/export` while authenticated.
- Deletion: use in-app entity controls; for full wipe, delete user data by
  `user_id` and remove the Clerk user. See `docs/privacy-and-data.md`.

## Unsupported claims

Self-hosting does not automatically make the system “air-gapped,” “HIPAA,” or
“enterprise ready.” Those require your architecture and process choices.
