# Brief — Seed once at signup; duplicate-aware entity-cap guard

Status: implemented in this repo (PR: branch `fix/seed-once-duplicate-aware-cap`, two commits).
This document is the design record for the hand-port to **sophionos-cloud** — the
migration SQL, the RPC contract, the gating shape, and the proof methodology are
what the port carries. Bugs confirmed live on the downstream cloud deployment
2026-11-01 (Core is upstream of that code).

## Survey (as implemented against)

### Every caller of `seedDefaultAreas`, and when it fires today

| Caller | Fires |
| --- | --- |
| `src/components/providers/auth-provider.tsx` — bootstrap effect | On every client mount of `AuthProvider` with a user, once per in-memory `seededUserIdsRef` entry per browser session (resets on full page reload). `AuthProvider` mounts in three layouts: `(dashboard)`, `onboarding`, `(trust)` — so a completed user's dashboard load, a new user's wizard load, and a signed-in visitor's policy-page load all issue the seed. Per login, not per signup. |
| `docs/**` mention of `src/app/api/v1/areas/seed-defaults/route.ts` | Referenced in the field-level-encryption plan as "Phase 3 NEW"; the route does not exist in the tree. No other callers. |

The seed's write path was the client upsert
(`.upsert(..., { onConflict: "user_id,slug", ignoreDuplicates: true })`) — no
encryption context on the areas table (plain columns; `description` is plain
text), so no write-path surprises beyond the two flaws below.

### The entity-cap trigger (Wall 1)

- **Trigger name:** `trg_enforce_entity_cap` — `BEFORE INSERT ... FOR EACH ROW`
  on 8 tables: `areas`, `goals`, `projects`, `tasks`, `notes`, `resources`,
  `contacts`, `contact_logs` (migration `20260701000004_entity_cap_wall.sql`).
- **Function:** `public.enforce_entity_cap()` — SECURITY DEFINER; tier read from
  an active `subscriptions` row, missing row ⇒ `free` (fail-closed); raises
  `ENTITY_LIMIT_REACHED` (errcode `P0001`) when the count ≥ 100.
- **Counting rule:** per-user **total** across the 8 counted tables (not
  per-type). `note_notebooks` is excluded (no `user_id`; junction per D3).
- **Counter mechanics:** running table `user_entity_counts(clerk_user_id,
  entity_count)` maintained by `AFTER INSERT`/`AFTER DELETE` triggers
  (`trg_entity_count_insert` / `trg_entity_count_delete`) calling
  `public.bump_entity_count(user_id, ±1)` — SECURITY DEFINER, floored at 0,
  `EXECUTE` revoked from `PUBLIC`/`authenticated`/`anon`.

### The anchor record

**Chosen: the `user_settings` row at `key = 'onboarding'`** (the record
`onboarding-routing.ts` consumers already read on every sign-in).

Evidence, and why the alternative was rejected:

1. **No per-user DB row is created at the Clerk signup instant.** Core has no
   `user.created` webhook; signup redirects to `/dashboard`, whose layout
   server-redirects to `/onboarding` until onboarding completes.
2. **`subscriptions` is not guaranteed.** Migration `20260913000001` revokes
   `EXECUTE` on `provision_subscription()` from `authenticated` (service role /
   billing webhook only), and its RLS is SELECT-only to the owner. A new
   account therefore has **no** subscriptions row until a billing event fires.
   It cannot anchor a signup-time marker.
3. **The `onboarding` anchor row** is read on every dashboard sign-in
   (`(dashboard)/layout.tsx` → `getOnboardingState`), written by the wizard's
   first step (`onboarding-content.tsx` `persist()`), and no account can reach
   the dashboard without `completed = true` persisted in it — every initialized
   account has one. For accounts that never advanced the wizard's first step,
   the seed RPC creates the anchor row with the marker stamped (same
   transaction), and the gate treats a missing row exactly like NULL.
4. **The marker is a column, not a JSON field:** the wizard's `persist()`
   replaces the whole `user_settings.value` object, so a marker inside `value`
   would be wiped on the next step. `areas_seeded_at timestamptz` sits beside
   `value` and no write path ever touches it except the one-way set.

## Change 1 — seed exactly once (migration `20261101000000_areas_seeded_marker.sql`)

- `ALTER TABLE user_settings ADD COLUMN areas_seeded_at timestamptz` — NULL =
  never seeded, non-NULL = seeded once at that UTC time.
- **Retroactive backfill:** every pre-existing `key = 'onboarding'` row is
  stamped with its own `created_at` (best proxy for "initialized under the old
  regime"). Accounts without an anchor row are left NULL — their next sign-in
  completes initialization exactly once. Areas data untouched.
- **`seed_default_areas(p_areas jsonb)`** — SECURITY INVOKER (both writes are
  already covered by the caller's own RLS policies; no definer surface added),
  owner derived from `auth.jwt() ->> 'sub'`, never a caller argument:
  1. one-way gate: seed runs iff no `areas_seeded_at` for the anchor row
     (missing row ≡ NULL);
  2. insert the payload rows `ON CONFLICT (user_id, slug) DO NOTHING` — the
     row-writing semantics of the old per-login upsert, unchanged;
  3. stamp the marker **in the same transaction** (`WHERE areas_seeded_at IS
     NULL`), creating the anchor row (with the app's default onboarding shape)
     when it does not exist yet. One-way; nothing clears it; deleting areas
     never touches it.
- **Re-gated callers:** `seedDefaultAreas()` (service) now calls the RPC with
  the `DEFAULT_AREAS` payload; `AuthProvider` takes `initialAreasSeededAt` from
  the server layouts — a set marker means the bootstrap effect issues **no seed
  call at all** (and no areas invalidation). All three mounting layouts
  (`(dashboard)`, `onboarding`, `(trust)`) pass the marker from a single
  `getOnboardingRow` read (value + marker in one query).

## Change 2 — duplicate-aware cap guard (migration `20261101000001_duplicate_aware_entity_cap.sql`)

`enforce_entity_cap()` is rewritten so that, for free-tier inserts, a row that
already exists under the table's unique constraint **does not raise** — the
statement's `ON CONFLICT` clause resolves it to `DO NOTHING`/`DO UPDATE`, no row
is added, and the `AFTER INSERT` counter never fires (accounting stays exact).
A genuinely new entity beyond the cap still raises.

Audited conflict keys (trigger checks the table's unique constraint **plus** the
row PK; keyed off `TG_TABLE_NAME`):

| Table | Unique constraint | Probe |
| --- | --- | --- |
| `areas` | `idx_areas_user_slug (user_id, slug)` | `(user_id, slug)` + `id` |
| `goals` | `idx_goals_slug_user (user_id, slug)` | `(user_id, slug)` + `id` |
| `projects` | `idx_projects_slug_user (user_id, slug)` | `(user_id, slug)` + `id` |
| `notes` | `idx_notes_slug_user (user_id, slug)` | `(user_id, slug)` + `id` |
| `contacts` | `contacts_user_id_slug_idx (user_id, slug) WHERE slug IS NOT NULL` (partial) | `(user_id, slug)` when non-NULL + `id` |
| `tasks` | PK only | `id` |
| `resources` | PK only | `id` |
| `contact_logs` | PK only | `id` |

Porting notes (two lessons learned during the proofs):

- **`NEW.<col>` cannot be referenced inside the multi-branch `CASE`** — plpgsql
  binds every field the expression mentions against `NEW` at plan time, and
  `tasks`/`resources`/`contact_logs` have no `slug`. The trigger therefore
  projects `user_id` / `id` / `slug` once via `to_jsonb(NEW)` into scalars and
  branches only on those.
- **goals' own `goal_slug_unique_trigger` fires alphabetically before the cap
  trigger**, so a goals slug-duplicate surfaces "Duplicate slug for user", never
  the cap — the duplicate-skip proof for goals runs through the PK probe.

## Proofs (scratch PostgreSQL 16.9, production-shaped)

Method: a scratch cluster (portable binaries, port 5433) built from **the repo's
real migrations applied verbatim** — the 111 on `master` minus the 6
Supabase-infra-only ones (storage buckets / pg_cron), 105 applied — plus minimal
`auth.*` / `storage.*` stubs and Supabase-equivalent grants. Proofs run as
`postgres` for trigger-level checks and as `authenticated` +
`request.jwt.claims` for the RPC path (real RLS). Note: the brief says "8
starter areas"; `DEFAULT_AREAS` is 9, and the proofs assert against the real
set.

Failing-before first (13 failures), then the two migrations applied, then
passing-after (20/20):

| Proof | Before | After |
| --- | --- | --- |
| P1 capped user holding all 9 starter areas; seed-shaped upsert of the same 9 | `RAISED: ENTITY_LIMIT_REACHED` | completes; areas = 100 unchanged; `entity_count` = 100 |
| P2 cap still caps (genuinely new entity) | raises ✓ | raises ✓ |
| P3 resurrection: seed → delete 4 → later sign-ins | resurrects to 9 (bug) | stays 5; marker stamped once |
| P4a never-initialized user (no anchor row, 0 areas) | — | seeds 9 + creates anchor row + stamps marker, as `authenticated` through RLS |
| P4b deliberately-emptied user (marker set, deletes all) | — | sign-in seeds nothing; marker unchanged; 0 areas persists |
| P5 interrupted initialization (defect trigger fires between inserts and stamp) | — | full rollback: 0 areas, anchor row present but marker NULL; retry (×2) completes exactly once |
| P6 backfill census | — | both pre-existing anchor rows stamped with their `created_at`; `preferences`/`notifications` rows NULL; no-anchor account untouched; 18 census areas unchanged |
| AUDIT × 8 tables: duplicate-shaped upsert per table's real unique key | all 8 raise (bug) | all 8 no-raise, rows unchanged; counter exact (100); NULL-slug genuinely-new row still raises; goals slug-dup surfaces the slug guard, never the cap |

Raw transcripts: `proof_transcript_before.txt` / `proof_transcript_after.txt`
(scratch, not committed).

## Out of scope (unchanged)

Cap value (100), tier resolution, counter mechanics, readers/decryptors,
storage. `provisionSubscription()` keeps its unchanged bootstrap role (note: on
deployments where `20260913000001` is applied, its client call already fails
permission-denied and is swallowed — pre-existing, not touched here).

## Known behavioral notes for the port

- A never-initialized **capped** user (marker NULL, count ≥ 100 from other
  counted tables) still cannot be seeded — the cap raises on the genuinely-new
  seed rows. Cap values intentionally unchanged; the marker stays NULL and the
  next sign-in retries.
- Accounts created between the migration landing and the new code deploying
  have unstamped anchor rows; their next sign-in re-runs the seed idempotently
  (no-op inserts) and stamps the marker once.
