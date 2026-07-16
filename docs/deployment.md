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

A full multi-service Compose stack is **optional/P1**. For alpha, prefer the
documented local path (`pnpm dev` + Supabase CLI or hosted Supabase) unless you
maintain your own Dockerfile.

## Upgrades

See `docs/release-process.md`. Backup Postgres before applying migrations.
