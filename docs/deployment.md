# Deployment notes

SophionOS is a Next.js application plus Supabase (Postgres) and Clerk.

## Supported evaluation path

1. Deploy the Next.js app to a Node host (e.g. Vercel, Docker Node image, VPS).
2. Point env vars from `.env.example` at your **Clerk** and **Supabase** projects.
3. Apply `supabase/migrations` to the database.
4. Set `NEXT_PUBLIC_APP_URL` to the public app origin (including `app.` host if used).
5. Configure TLS at the platform or reverse proxy.

## Operator checklist

- [ ] Secrets only in the host secret store (not git)
- [ ] Service-role key never exposed to browsers
- [ ] Database backups scheduled and restore-tested
- [ ] Clerk production instance + allowed origins configured
- [ ] Rate limits and tier gates understood for your threat model
- [ ] Read `docs/known-limitations.md` (API/MCP experimental)

## Docker

- `Dockerfile` — multi-stage production build of the Next.js app.
- `docker-compose.yml` — evaluation run of the app with env from the host.

Clerk and Supabase are **not** bundled. Prefer `pnpm dev` + Supabase CLI for
day-to-day development; use Docker when validating a production-like image.

## Upgrades

See `docs/release-process.md`. Backup Postgres before applying migrations.
