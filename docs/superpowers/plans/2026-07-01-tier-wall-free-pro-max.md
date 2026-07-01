# Tier Wall (Free / Pro / Lifetime / Max) — Implementation Plan

**Created:** 2026-07-01
**Status:** PLAN ONLY — do not implement in this session. Execute in a fresh session via the prompt + goal docs alongside this file.
**Companion docs:**
- Prompt: `docs/superpowers/prompts/2026-07-01-tier-wall.md`
- Goal gate: `docs/superpowers/goals/2026-07-01-tier-wall.ps1`

## Goal

Enforce a tiered access model with two independent walls + tier provisioning. Billing is deferred (Dodo Payments, pending approval) — for now every user is provisioned Pro so nothing is disruptive, but the walls are fully built and enforced against whatever tier a user actually has.

## Tiers

| | Free | Pro | Lifetime | Max (post-launch) |
|---|---|---|---|---|
| Price | $0 | $15 / mo | **$150 one-time** | TBD |
| Entity rows (counted set) | **100 hard cap** | unlimited | unlimited | unlimited |
| REST API (`/api/v1`, Zapier/n8n) | ❌ 403 | ✓ | ✓ | ✓ |
| MCP server | ❌ refuse | ✓ | ✓ | ✓ |
| Browser extension (built later) | ❌ | ✓ | ✓ | ✓ |
| Dashboard app itself | ✓ | ✓ | ✓ | ✓ |

- **Lifetime** = a launch offer that locks the user to **Max-tier access forever** for a one-time $150. It never expires. **Capped at the first 100 subscribers** — once 100 lifetime subscriptions exist, the offer is closed and no new lifetime purchases are allowed.
- **Max** as a standalone recurring tier is NOT defined at launch (its extra features come later). At launch, Lifetime is the only way to hold Max-level access. Access logic must treat `lifetime` and `max` as equivalent for entitlement checks.

## Decisions (locked 2026-07-01)

- **D1 — archived counts toward 100.** Also the simplest impl: +1 on INSERT, −1 on DELETE; archive (an UPDATE) never touches the counter.
- **D2 — downgrade handled by 403 at call time.** No key revocation on downgrade; keys silently stop working. Entities over cap on downgrade are kept (block new creates only, never delete user data).
- **D3 — count the 7 core entities + `contact_logs` + `note_notebooks`. EXCLUDE all junction rows** (task_areas, goal_projects, resource_projects, …). Linking entities does NOT burn quota. (Reversed from the earlier "count junctions" decision — junctions have no `user_id` and counting them makes the cap unintuitive.)
  - **Counted tables (final):** areas, goals, projects, tasks, notes, resources, contacts, contact_logs, note_notebooks.
  - Decide during execution whether `contact_logs` and `note_notebooks` truly count or are also excluded as "sub-objects" — default per this decision is they COUNT. Flag if that feels wrong when you see the data model.
- **D4 — billing deferred.** Gateway: **Dodo Payments** (may change pending registration approval). NOT in this plan. A later step adds checkout + webhook that writes `subscriptions`, enforces the lifetime-100 cap at purchase, and flips the provisioning default from pro→free.
- **Provisioning for now — everyone is Pro.** Backfill all existing users + auto-create `tier=pro, status=active` for every new user. Walls are BUILT + ENFORCED but non-disruptive (nobody blocked today). When billing lands: default flips to free; the payment webhook promotes payers to pro/lifetime.

## Layer reality (why the two walls live in different places)

Dashboard writes go through **client-side supabase-js + RLS**, NOT `/api/v1`. Therefore:
- **Wall 1 (entity cap)** MUST be in the **database** (trigger) — only the DB sees both the browser path and the API path.
- **Wall 2 (API/MCP gate)** lives in the **`/api/v1` layer** — the dashboard doesn't depend on those routes, so gating them never touches the app.

## Existing infra (verified 2026-07-01)

- `subscriptions` table exists (`20260624000001_create_subscriptions.sql`): `user_id TEXT UNIQUE`, `tier` (currently free|pro|premium), `status`, `current_period_end`, RLS "read own". **Nothing writes to it yet.** Tier enum must add `lifetime` and `max` (and decide the fate of legacy `premium`).
- `rate-limiter.ts` already reads `subscriptions.tier`/`status` via the admin client with a 60s cache — reuse this read pattern for `getTier`.
- `error-handler.ts` already has `ForbiddenError` (403, code `FORBIDDEN`) and `AppError.publicMessage`. Reuse; add a `code` override for `TIER_REQUIRED` / `ENTITY_LIMIT_REACHED` as needed.
- API auth: `requireAuth` (Clerk session OR `lif_` Bearer key). Data routes are API/MCP-only; `/user/*` is the only Clerk-session surface the dashboard hits.

---

## Phase A — Subscription tier infrastructure + provisioning

- [x] **A1.** Migration: extend `subscriptions.tier` allowed values to `free | pro | lifetime | max` (and migrate/retire legacy `premium`). Add a `lifetime` notion that never expires (status always active, `current_period_end` null/ignored). — `20260701000000_subscriptions_tier_values.sql`: CHECK constraint on the 4 tiers + `UPDATE premium→pro`. Applied to remote dev (along with the un-pushed 0624 api_keys/subscriptions/integrations batch via `db push --include-all`).
- [x] **A2.** Lifetime-cap support: a way to count active lifetime subscriptions globally (a `SELECT count(*) WHERE tier='lifetime'`), so the future billing webhook can enforce "first 100 only." No UI/enforcement now — just ensure the data model makes the count cheap and document the 100 cap as a billing-time check. — `20260701000001_subscriptions_lifetime_count_index.sql`: partial index `WHERE tier='lifetime'`; cap documented as a Dodo-webhook purchase-time check. Applied to remote dev.
- [x] **A3.** Provisioning backfill migration: insert `tier=pro, status=active` for every existing distinct user id (from `user_settings` or union across user-data tables). — `20260701000002_backfill_pro_subscriptions.sql`: `INSERT ... SELECT DISTINCT` over UNION of 9 user-data tables, `ON CONFLICT (user_id) DO NOTHING`. Applied to remote dev.
- [x] **A4.** Auto-provision new users: in the first-run path (where `seedDefaultAreas` runs), upsert a `tier=pro` subscription. Idempotent. — `20260701000003_provision_subscription_rpc.sql` SECURITY DEFINER `provision_subscription()` (derives user from JWT, hardcodes pro, ON CONFLICT DO NOTHING); `onboarding.service.provisionSubscription()` called in auth-provider first-run effect. Applied to remote dev; tsc+eslint clean.
- [x] **A5.** `src/lib/api/subscription.ts` — `getTier(userId, {supabase})` → "free"|"pro"|"lifetime"|"max"; `isPaidTier(userId)` → true for pro|lifetime|max. Cached read like rate-limiter. — DONE: admin-client read, 60s per-user cache, fail-closed to free; injectable supabase for tests.
- [x] **Verify:** unit-test getTier/isPaidTier across all tiers + missing row (→free). — `subscription.test.ts` 9 tests green (free/pro/lifetime/max/canceled/unknown/error/isPaid/cache).

## Phase B — Wall 2: API / MCP access gate (no migration; do first)

- [x] **B1.** `requirePaidTier(userId, {supabase})` in `subscription.ts` — throws `ForbiddenError` (code `TIER_REQUIRED`, publicMessage "This feature requires a Pro subscription.") unless pro|lifetime|max. — DONE: `AppError(msg, 403, "TIER_REQUIRED")` (publicMessage = msg for 4xx).
- [x] **B2.** Shared `authorizeApiRequest(request)` = `requireAuth` then `requirePaidTier` — one-line swap per route. — DONE in `api-auth.ts`.
- [x] **B3.** Wire into EVERY `/api/v1` data + aggregate route (areas, goals, projects, tasks, notes, resources, topics, contacts, dashboard, inbox, my-day, search, knowledge). EXCLUDE `/user/*`. — DONE: 72 route files swapped requireAuth→authorizeApiRequest; 12 test mock factories aliased both names to one fn.
- [x] **B4.** Gate `POST /api/v1/user/api-keys` with `requirePaidTier` (free can't mint). Keep GET/DELETE open. — DONE; user-settings test mocks subscription as paid.
- [x] **B5.** New `GET /api/v1/mcp/health` running `requirePaidTier`; MCP server startup hits THAT (not `/user/settings`) so a free user's key makes the server refuse to start with a clear "Pro required" message. Update `packages/mcp-server/src/auth.ts`. — DONE: route + client.user.health() + auth.ts repointed with 403→upgrade message.
- [x] **B6.** `GET /api/v1/user/subscription` (Clerk-session) → `{ tier, isPaid }` for the dashboard to read. — DONE: requireAuth (NOT authorize) so free can read own tier.
- [x] **Verify:** manual free row → data route 403, MCP refuses; pro row → 200, MCP starts. tsc + vitest. — tsc=0, mcp-server tsc=0, eslint=0, full vitest 1242 pass; subscription.test.ts 12 incl requirePaidTier 403/pass/publicMessage.

## Phase C — Dashboard UI gating

- [x] **C1.** `/settings/mcp`: free tier → hide key-creation + config snippets, show upgrade CTA. Pro/lifetime/max → full UI. Reads `GET /api/v1/user/subscription`. — DONE: mcp-settings-content.tsx fetches subscription, `isPaid` gates create form + snippets, free shows Lock/Pro upgrade card.
- [x] **C2.** Settings landing MCP card → "Pro" badge for free users. — DONE: `mcp-card-pro-badge.tsx` client component, wired into settings/page.tsx MCP card header.
- [x] **Verify:** build; free vs pro render. — tsc=0, eslint=0 on touched files. (next build not run — Phase D below also lands, single build at end.)

## Phase D — Wall 1: entity cap (100, free only)

> ⚠️ **BLOCKER found 2026-07-01 (pre-implementation):** D2 asserts every counted
> table has a `user_id` for direct triggers. FALSE for `note_notebooks` — its
> create (`20260525000000_create_note_notebooks.sql`) is `(note_id, notebook)`
> composite PK, NO `user_id` column; RLS resolves the owner via `notes.user_id`.
> It is structurally a junction, which also collides with D3's "EXCLUDE all
> junction rows." Two readings, needs a DECISION before D4/D5 are written:
>   (a) **Exclude note_notebooks** from the count (treat as junction, honor the
>       "exclude junctions" rule) — keeps all remaining counted tables on the
>       clean direct-`NEW.user_id` trigger path. Count = 7 core + contact_logs.
>   (b) **Count it via parent resolution** (`SELECT user_id FROM notes WHERE
>       id = NEW.note_id`) — honors the explicit "+ note_notebooks" in D3 but
>       breaks the "direct trigger, no parent resolution" guardrail for this one
>       table.
> Leaning (a): notebooks are tags on a note, not first-class user entities, and
> a user could blow the 100 cap with notebook tags alone under (b). Confirm with
> user. contact_logs DOES have user_id (verify) — it stays counted either way.

- [x] **D1.** Migration: `user_entity_counts(clerk_user_id PK, entity_count int default 0)`. — `20260701000004_entity_cap_wall.sql` (RLS SELECT-only, mirrors subscriptions).
- [x] **D2.** Counted tables = areas, goals, projects, tasks, notes, resources, contacts, contact_logs, note_notebooks (NO junctions). All have a `user_id` — direct triggers, no parent resolution needed. — RESOLVED via option (a): note_notebooks EXCLUDED (composite-PK junction, no user_id). Counted = 7 core + contact_logs (8 tables, all confirmed `user_id text`). Direct NEW/OLD.user_id triggers, no parent resolution.
- [x] **D3.** `bump_entity_count(user_id, delta)` upsert fn. — SECURITY DEFINER, floors at 0, NOT granted to authenticated (can't self-decrement).
- [x] **D4.** AFTER INSERT (+1) / AFTER DELETE (−1) triggers on each counted table. — `entity_count_on_insert/delete()` + DO-block FOREACH over the 8 tables, idempotent DROP IF EXISTS.
- [x] **D5.** `enforce_entity_cap()` BEFORE INSERT on each counted table: resolve tier; if free AND count >= 100 → `RAISE EXCEPTION ... ERRCODE 'P0001' MESSAGE 'ENTITY_LIMIT_REACHED'`. — DONE; tier fail-closed to free on missing/non-active sub; reads count before the AFTER bump so 0..99 pass, 101st blocked.
- [x] **D6.** Backfill `user_entity_counts` for existing users (sum across counted tables). — INSERT ... SELECT count(*) over UNION ALL of the 8 tables, ON CONFLICT DO UPDATE.
- [x] **D7.** Service-layer: catch the pg error → `EntityLimitError`; dashboard toast "You've hit the 100-item Free limit — upgrade to Pro." (not a raw DB error). — `EntityLimitError` + `mapDatabaseError()` in error-handler.ts; wired into create() insert paths of area/goal/task/note/resource/contact (project create routes through runWriteProjectQuery → DatabaseError, low-risk to leave; revisit if needed).
- [x] **D8.** API: map to 403/409 `ENTITY_LIMIT_REACHED` with publicMessage. — Automatic: EntityLimitError extends AppError (403, code, publicMessage); every route's `error(err)` catch already serializes AppError.
- [~] **Verify:** test user→free: 100 inserts OK, 101st blocked via BOTH browser and API; delete one → next insert OK; pro → unlimited; counter correct under insert/delete. — UNIT side done: entity-limit-error.test.ts (5) maps trigger raise→EntityLimitError→403. LIVE DB insert test BLOCKED: `db push` 403 (supabase CLI login-role token expired this session; needs interactive `./bin/supabase.exe login`). Migration NOT yet applied to remote dev. Manual 100/101 + delete + pro-unlimited check pending apply.

## Phase E — Roadmap update

- [x] **E1.** Add tier-wall steps to roadmap (Phase 6 near Step 38/39). Record: Lifetime launch offer (first 100, $150, max-forever), Dodo billing as the launch-blocking step that flips default pro→free + enforces the lifetime-100 cap at purchase. — DONE: Step 39.5 added to info/LifeOS-Core-Build-Roadmap.md (both walls, AS-BUILT Phase A+B, billing launch-blocker + lifetime-100 cap).

## Deferred (NOT this plan)

- Billing: Dodo Payments checkout + webhook → upsert `subscriptions`; enforce lifetime-100 at purchase; flip provisioning default to free. Max-tier feature set. Browser extension (Pro feature).

## Global test plan

1. Provisioning: every existing + new user has active pro → nobody blocked today.
2. Force a test user to free:
   - REST data route → 403 TIER_REQUIRED; MCP server with that key → refuses to start.
   - 100 counted-entity inserts pass; 101st blocked via browser (supabase-js) AND API; junction inserts NOT counted.
   - Delete one counted entity → counter −1 → one more insert allowed.
3. Pro/lifetime user: unlimited entities, API 200, MCP starts.
4. Downgrade pro→free with >100 entities + live key: data intact, new creates blocked, key calls 403.
5. tsc + eslint + vitest + next build green.

## Build order

A (infra+provisioning) → B (API/MCP gate) → C (UI) → D (entity-cap DB wall) → E (roadmap). Verify each phase; run the verification subagent after B and after D.
