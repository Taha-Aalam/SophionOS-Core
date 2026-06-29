# App Subdomain + Port 3030→3000 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the app under an `app.` subdomain via a host-agnostic env var, and standardize the local dev port from 3030 to 3000.

**Architecture:** The app already routes relatively, so no routing/proxy code changes. Introduce `NEXT_PUBLIC_APP_URL` as the single source of the public origin (never hardcoded), flip the local Supabase port config to 3000, and document the Vercel + dashboard wiring as a manual checklist. VPS/reverse-proxy production is deferred to a future spec.

**Tech Stack:** Next.js 16 (App Router), Clerk auth (`src/proxy.ts`), Supabase, Vercel (current host).

## Global Constraints

- Production domain MUST NOT be hardcoded anywhere — supplied only via `NEXT_PUBLIC_APP_URL` (no trailing slash). Example value `https://app.this-is-a-domain.io` is illustrative; real prod domain differs.
- Local dev port is `3000` (Next default). Do not pass `-p 3030`.
- Do NOT touch historical docs/plans/specs under `docs/superpowers/` that reference 3030 — they are dated records.
- Git: stage explicit files only — never `git add -A` or `git add .`. The working tree has unrelated uncommitted changes that must not be swept in.
- No marketing/apex route is added; apex is reserved for a future site.

---

### Task 1: Standardize local Supabase config to port 3000

**Files:**
- Modify: `supabase/config.toml:154,157,158,159,160,190`

**Interfaces:**
- Consumes: nothing.
- Produces: local Supabase auth allowlist now expects the app at `:3000`. Task 2's dev URL (`http://localhost:3000`) must match these entries.

- [ ] **Step 1: Replace every `3030` with `3000` in the auth block**

Edit these exact lines in `supabase/config.toml`:

```toml
site_url = "http://127.0.0.1:3000"
```

```toml
additional_redirect_urls = [
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3000/auth/callback",
  "http://localhost:3000",
  "http://localhost:3000/auth/callback",
]
```

```toml
# rp_origins = ["http://127.0.0.1:3000"]
```

- [ ] **Step 2: Verify no 3030 remains in the file**

Run: `grep -n 3030 supabase/config.toml`
Expected: no output (exit code 1).

- [ ] **Step 3: Commit**

```bash
git add supabase/config.toml
git commit -m "chore: standardize local supabase auth port to 3000"
```

---

### Task 2: Introduce `NEXT_PUBLIC_APP_URL` env var

**Files:**
- Modify: `.env.example`
- Modify: `.env.local`

**Interfaces:**
- Consumes: nothing.
- Produces: env var `NEXT_PUBLIC_APP_URL` — the public origin with no trailing slash. Read by any future code/metadata needing an absolute URL; set per-environment in Vercel (Task 4).

- [ ] **Step 1: Add the documented placeholder to `.env.example`**

Append to `.env.example` (after the Clerk block):

```
# App
# Public origin the app is served from (no trailing slash).
# Dev: http://localhost:3000  |  Prod: https://app.<your-domain>
NEXT_PUBLIC_APP_URL=
```

- [ ] **Step 2: Set the dev value in `.env.local`**

Append to `.env.local`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: Verify**

Run: `grep -n NEXT_PUBLIC_APP_URL .env.example .env.local`
Expected: one line in each file; `.env.local` value is `http://localhost:3000`.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "feat: add NEXT_PUBLIC_APP_URL for host-agnostic origin"
```

> Note: `.env.local` is gitignored — Step 2 is local-only and not committed. Do not force-add it.

---

### Task 3: Confirm no hardcoded origin/port in app config & code

**Files:**
- Review: `next.config.ts`
- Review: `src/proxy.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: confirmation that the app is host-portable; no code edits expected.

- [ ] **Step 1: Confirm CSP/config has no hardcoded app origin or port**

Read `next.config.ts`. Verify the CSP `default-src`/`connect-src` are `'self'`-based (they reference Supabase/Clerk hosts derived from env, not the app's own absolute origin). Confirm no literal `localhost:3030`, `3030`, or example domain appears.

Run: `grep -rnE "3030|localhost:30|this-is-a-domain" next.config.ts src/`
Expected: no output. (If any match appears, replace the literal with a value derived from `process.env.NEXT_PUBLIC_APP_URL`, then re-run.)

- [ ] **Step 2: Confirm middleware needs no host logic**

Read `src/proxy.ts`. Verify route matching uses relative path patterns only (no host/origin checks). No change required — apex is reserved for a future separate site, so no subdomain-split logic belongs here.

- [ ] **Step 3: No commit if no edits**

If Step 1 produced a fix, commit it:

```bash
git add next.config.ts
git commit -m "chore: derive app origin from NEXT_PUBLIC_APP_URL"
```

Otherwise skip — nothing to commit.

---

### Task 4: Document Vercel + dashboard wiring checklist

**Files:**
- Create: `docs/superpowers/runbooks/2026-06-27-app-subdomain-vercel-cutover.md`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_APP_URL` (Task 2), local port 3000 (Task 1).
- Produces: a manual runbook the operator follows in external dashboards. No app code depends on it.

- [ ] **Step 1: Write the runbook**

Create `docs/superpowers/runbooks/2026-06-27-app-subdomain-vercel-cutover.md` with:

```markdown
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

## 5. Verify (see plan's Manual Verification task)

## Deferred (future VPS spec)
- DNS A record → VPS IP; nginx/Caddy vhost; TLS; process manager.
- Reverse proxy MUST forward `Host`, `X-Forwarded-Proto https`, `X-Forwarded-Host`,
  `X-Forwarded-For` so Clerk builds correct absolute redirect URLs (Vercel does this
  automatically; a raw VPS does not).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/2026-06-27-app-subdomain-vercel-cutover.md
git commit -m "docs: vercel subdomain cutover runbook"
```

---

### Task 5: Update live dev-environment memory note

**Files:**
- Modify: `C:\Users\tahaa\.claude\projects\C--Users-tahaa-OneDrive-Documents-SaaS-LifeOS-Core\memory\user-dev-environment.md`

**Interfaces:**
- Consumes: port-3000 decision (Task 1).
- Produces: corrected memory so future sessions use port 3000.

- [ ] **Step 1: Change the port references in the note body**

In `user-dev-environment.md`, update:
- Line 10: "Local dev server runs on **port 3000** (the Next.js default)."
- The **Why** line: note the user moved from 3030 to 3000 on 2026-06-27 to align with the app-subdomain migration.
- **How to apply** bullet: `Start the dev server with the default port: \`npx next dev\` (port 3000). Do not pass \`-p 3030\`.`
- Keep the `kill-port` and worktree guidance, but reference `3000` as the primary port.

- [ ] **Step 2: Verify**

Run: `grep -c 3030 "/c/Users/tahaa/.claude/projects/C--Users-tahaa-OneDrive-Documents-SaaS-LifeOS-Core/memory/user-dev-environment.md"`
Expected: `0` (or only the historical worktree anecdote line if intentionally retained — prefer 0 in the "how to apply" guidance).

- [ ] **Step 3: No git commit**

This file lives outside the repo (user memory dir). Do not `git add` it.

---

### Task 6: Manual verification

**Files:** none (runtime check).

**Interfaces:**
- Consumes: all prior tasks.
- Produces: confirmation the app works on port 3000 locally and the env var is wired.

- [ ] **Step 1: Start the dev server on the default port**

Run: `npx kill-port 3000` (only if a stale server is bound), then `pnpm dev`.
Expected: server reports `Local: http://localhost:3000` within a few seconds.

- [ ] **Step 2: Verify login round-trip**

Open `http://localhost:3000`. Expected: redirect to `/dashboard` (if signed in) or Clerk login. Sign in. Expected: lands on `/dashboard`, no console CSP/origin errors.

- [ ] **Step 3: Confirm env var is readable**

Verify a Clerk/Supabase auth action completes (e.g. page loads authed data). No `localhost:3030` references should appear in network requests.

- [ ] **Step 4: (Operator) Run the Vercel runbook**

Follow `docs/superpowers/runbooks/2026-06-27-app-subdomain-vercel-cutover.md`, then load `https://app.<domain>`: confirm Clerk login round-trips and Supabase auth callback succeeds.

---

## Self-Review

**Spec coverage:**
- Domain model / env var → Task 2, Task 3. ✓
- Port 3030→3000 (config) → Task 1. ✓
- Memory note update → Task 5. ✓
- `next.config.ts` review → Task 3. ✓
- No proxy/routing change → Task 3 confirms. ✓
- Vercel + Clerk + Supabase dashboard wiring → Task 4 runbook. ✓
- VPS deferral noted → Task 4 "Deferred" section. ✓
- Verification → Task 6. ✓

**Placeholder scan:** No TBD/TODO; all edits show exact content. `<domain>` is an intentional operator-substituted token in the runbook, not a plan gap.

**Type consistency:** Single identifier `NEXT_PUBLIC_APP_URL` used consistently across Tasks 2, 3, 4, 6. Port `3000` consistent across Tasks 1, 5, 6.
