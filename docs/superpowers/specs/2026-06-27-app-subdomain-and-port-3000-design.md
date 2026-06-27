# App Subdomain + Port 3030→3000 — Design

**Date:** 2026-06-27
**Status:** Approved (brainstorming)

## Goal

Serve the application under an `app.` subdomain (e.g. `app.this-is-a-domain.io`)
instead of the apex domain, and standardize the local dev port from `3030` to
`3000`. The production domain differs from the example and must **never** be
hardcoded — it is supplied per-environment via a single env var.

## Context (current state)

- Single Next.js 16 (App Router) app. Root `/` redirects to `/dashboard`
  (`src/app/page.tsx` → `DEFAULT_POST_LOGIN_PATH`). No separate marketing site.
- Auth = Clerk. Middleware lives in `src/proxy.ts` (Next 16 renamed
  `middleware` → `proxy`). Deny-by-default; public routes: `/`, `/login`,
  `/signup`.
- Data = Supabase.
- **All in-app routing is relative** — no hardcoded domains anywhere in `src/`
  (verified by grep). The only `window.location` use is reading the current URL,
  not constructing an origin.
- Port `3030` in real config exists only in `supabase/config.toml` (4 lines).
  `package.json` `dev` script is `next dev --turbopack` (already portless →
  defaults to 3000). All other `3030` hits are historical docs/plans under
  `docs/superpowers/`.

## Decisions

| Question | Decision |
|---|---|
| Apex domain behavior | Reserved for a **future** marketing site. Not built now; this app adds **no** apex redirect and no marketing route. |
| Domain supply | Single env var `NEXT_PUBLIC_APP_URL` (e.g. `https://app.this-is-a-domain.io`). Nothing hardcoded. |
| Hosting now | Vercel (dev/preview). |
| Hosting later | Self-hosted VPS behind a reverse proxy — **separate spec at cutover**, not covered here. |
| Plan scope | Vercel-now + host-agnostic code/env changes only. |

## Why this is mostly config, not code

The app is already subdomain-ready: relative routing works under any host. The
code change is limited to introducing `NEXT_PUBLIC_APP_URL` so that any URL which
*must* be absolute (Clerk redirect targets, Supabase auth callbacks, future
canonical/OG metadata) resolves to the correct host per environment. Choosing an
env var over hardcoding is what makes the later Vercel→VPS migration a
config/DNS/proxy change with **zero code edits**.

## Scope

### A. Code / repo changes

1. **`.env.example`** — add:
   ```
   # Public origin the app is served from (no trailing slash).
   # Dev: http://localhost:3000  |  Prod: https://app.<your-domain>
   NEXT_PUBLIC_APP_URL=
   ```
2. **`.env.local`** — add `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
3. **`supabase/config.toml`** — replace `3030` → `3000` on the 4 lines:
   - `site_url = "http://127.0.0.1:3000"`
   - `additional_redirect_urls` entries (`127.0.0.1:3000`, `127.0.0.1:3000/auth/callback`, `localhost:3000`, `localhost:3000/auth/callback`)
   - (commented `rp_origins` line — update for consistency.)
4. **`next.config.ts`** — review only. CSP is `'self'`-based, so the app's own
   origin needs no allowlisting. No change expected; confirm during
   implementation that nothing references the old port/origin.
5. **`src/proxy.ts` & routing** — **no change**. Relative routing already works
   under any host.
6. **Live memory note** — update `user-dev-environment.md` (port 3000). Historical
   plan/spec docs under `docs/superpowers/` are dated records — leave untouched.

### B. External wiring — Vercel (manual; documented as a checklist in the plan)

These are dashboard/DNS actions, not repo changes:

- **Vercel project**: add `app.<domain>` as a domain; create DNS
  `CNAME app → cname.vercel-dns.com`. Leave apex unassigned.
- **Vercel env vars**: set `NEXT_PUBLIC_APP_URL=https://app.<domain>` for
  Production (and the appropriate value for Preview). Ensure Clerk + Supabase
  keys are present per environment.
- **Clerk dashboard**: add `app.<domain>` to the production instance domain /
  allowed origins; update sign-in / sign-up redirect URLs to the subdomain.
- **Supabase dashboard**: set Site URL to `https://app.<domain>`; add
  `https://app.<domain>` and `https://app.<domain>/auth/callback` to the redirect
  allowlist. (The `supabase/config.toml` edits cover **local** dev only; the
  hosted project is configured in the dashboard.)
- **Local dashboards**: update any `localhost:3030` dev URLs in the Clerk/Supabase
  dashboards to `localhost:3000`.

### C. Out of scope (deferred)

- VPS + reverse-proxy production setup (DNS A record, nginx/Caddy vhost,
  `X-Forwarded-*` trust, TLS, process manager). Gets its own spec at cutover.
  **Note for that future spec:** behind a raw reverse proxy, Next/Clerk must
  trust `X-Forwarded-Proto`/`X-Forwarded-Host` to build correct absolute redirect
  URLs — Vercel handles this automatically, a VPS does not.
- Apex marketing site.
- Shared cross-subdomain Clerk session cookies (only needed if the future
  marketing apex shares auth).

## Verification

- **Local**: `pnpm dev` serves on `http://localhost:3000`; login → dashboard
  round-trip works; Supabase auth callback succeeds.
- **Vercel preview/prod**: `app.<domain>` loads; Clerk login round-trips and
  lands on `/dashboard`; Supabase auth callback succeeds; no mixed-origin/CSP
  errors in console.

## Risks

- **Stale dashboard allowlists** — easiest thing to forget; causes redirect
  failures post-cutover. Covered by the B checklist.
- **Port drift** — anyone still passing `-p 3030` will mismatch the new
  Supabase config. Mitigated by removing 3030 from the live memory note and
  relying on the default-3000 dev script.
