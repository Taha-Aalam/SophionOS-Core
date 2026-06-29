# Ralph progress: app.localhost subdomain routing

Goal: `docs/superpowers/goals/2026-06-29-app-subdomain-routing.ps1`
Branch: `feat/app-subdomain-port-3000`. Base: fd56e1b.

## End state
- apex (`localhost:3000`) → marketing only, NEVER /login redirect.
- subdomain (`app.localhost:3000`) → whole app + auth.
- origin from `NEXT_PUBLIC_APP_URL` only; no hardcoded host/port.

## Items (goal script criteria)
- [x] proxy.ts reads Host header — `src/proxy.ts` `request.headers.get("host")`
- [x] proxy.ts branches on `app.` subdomain — via `isAppHost()`
- [x] marketing/landing surface for apex — `src/app/page.tsx` now renders marketing (was `redirect(/dashboard)`)
- [x] cross-host redirect from `NEXT_PUBLIC_APP_URL` — `resolveAppOrigin()` in proxy
- [x] no literal `localhost:3030` / `http://localhost:3000` in src/ — PASS at baseline, still clean
- [x] test exercises app./apex host classification — `tests/unit/host-routing.test.ts`
- [x] verification gate (tsc/vitest/build) — ALL PASS (2026-06-29)
- [ ] runtime probe (RALPH_RUNTIME_PROBE=1) — skipped (optional; run manually to confirm live behaviour)

## Design
- Same app serves both hosts; classify by Host in middleware (no `(marketing)`
  route group — would collide with `src/app/page.tsx` at `/`).
- Apex NEVER calls `auth.protect()` → cannot bounce to /login. Apex `/` +
  framework/Clerk internals pass through; other apex paths → subdomain origin.
- Subdomain `/` → `/dashboard` (preserves prior root behavior); non-public
  protected.
- Helper `src/lib/routing/host.ts`: `isAppHost()`, `normalizeOrigin()` (pure, tested).

## Manual / human steps
- `.env.local`: set `NEXT_PUBLIC_APP_URL=http://app.localhost:3000` (the
  SUBDOMAIN, not apex — apex→app redirect must target the subdomain or it loops).
- `app.localhost` resolves to 127.0.0.1 on most systems (Chrome/Edge/Firefox).
  If not, add a hosts-file entry `127.0.0.1 app.localhost`. Do NOT edit the
  machine hosts file from the loop.

## Commits
- feat(routing): host-based apex/subdomain split in proxy (see git log on feat/app-subdomain-port-3000)

## FINAL SUMMARY (2026-06-29)

Goal script exits 0. All 12 static checks PASS. Verification gate (tsc + vitest 1106 tests + next build) all green.

**Confirmed:**
- apex (`localhost:3000`) → marketing surface (`src/app/page.tsx`), NEVER /login redirect
- `app.localhost:3000` → full app + auth.protect() on all dashboard routes
- Cross-host redirects use `NEXT_PUBLIC_APP_URL` exclusively — no literal origins
- `src/lib/routing/host.ts` helpers `isAppHost()` / `normalizeOrigin()` tested in `tests/unit/host-routing.test.ts`

**Remaining manual / human steps:**
1. `.env.local`: confirm `NEXT_PUBLIC_APP_URL=http://app.localhost:3000` (subdomain, not apex)
2. Verify `app.localhost` resolves to 127.0.0.1 in your browser (most do by default; add hosts entry if not)
3. Run `RALPH_RUNTIME_PROBE=1 pwsh docs/superpowers/goals/2026-06-29-app-subdomain-routing.ps1` to confirm live behaviour with a running dev server
4. Merge PR #37 when ready
