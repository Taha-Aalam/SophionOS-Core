# App Subdomain Cutover — Vercel Runbook

Replace `<domain>` with the real production domain (e.g. `app.this-is-a-domain.io`).
None of these steps are in the repo — they are dashboard/DNS actions.

## 1. DNS
- [ ] Add `CNAME app -> cname.vercel-dns.com` at the DNS provider.
- [ ] Leave the apex (`<domain>`) unassigned — reserved for a future marketing site.

## 2. Vercel project
- [ ] Project → Domains → add `app.<domain>`. Wait for "Valid Configuration".
- [ ] Project → Settings → Environment Variables:
      - `NEXT_PUBLIC_APP_URL=https://app.<domain>` (Production)
      - For Preview, set the appropriate preview origin.
      - Confirm Clerk + Supabase keys exist for each environment.

## 3. Clerk dashboard
- [ ] Set/confirm the production instance domain to `app.<domain>`.
- [ ] Add `https://app.<domain>` to allowed origins.
- [ ] Set sign-in / sign-up redirect URLs to the subdomain.
- [ ] Update any local dev URL from `localhost:3030` to `localhost:3000`.

## 4. Supabase dashboard (hosted project)
- [ ] Auth → URL Configuration → Site URL = `https://app.<domain>`.
- [ ] Add redirect URLs: `https://app.<domain>` and `https://app.<domain>/auth/callback`.
- [ ] Update any local dev URL from `localhost:3030` to `localhost:3000`.
      (Note: `supabase/config.toml` covers LOCAL dev only; the hosted project is configured here.)

## 5. Verify
- [ ] Load `https://app.<domain>` — confirm Clerk login round-trips to `/dashboard`.
- [ ] Confirm Supabase auth callback succeeds; no CSP/mixed-origin console errors.

## Deferred (future VPS spec)
- DNS A record → VPS IP; nginx/Caddy vhost; TLS; process manager.
- Reverse proxy MUST forward `Host`, `X-Forwarded-Proto https`, `X-Forwarded-Host`,
  `X-Forwarded-For` so Clerk builds correct absolute redirect URLs (Vercel does this
  automatically; a raw VPS does not).
