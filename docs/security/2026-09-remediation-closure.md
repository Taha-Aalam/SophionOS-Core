# SophionOS security remediation — closure report

**Date:** 2026-09-13 · **Branch:** `security/remediation-2026-09` (local; not
pushed — owner reviews then pushes) · **Spec:** authorized assessment report
of 2026-09-13 (`/home/maverick/Documents/SophionOS-Core`) · **Plan:**
`docs/superpowers/plans/2026-09-13-sophionos-security-remediation.md`

Every code, test, CI, and documentation task from the plan is implemented on
the branch. The remaining actions are owner-side operations that the agent
cannot and must not perform (production dashboards, credential rotation,
history rewrite/force-push, deploy); each has a runbook under `docs/security/`.

## Findings → fix → evidence

### Finding 1 — Cross-tenant junction linking (High, CVSS 8.5) — CLOSED in code

- **Fix (verified, then shipped):** `assertOwnedIds` guards + userId threading
  across contact/note/project/resource/topic/goal junction writers; resource
  link routes thread `userId` through every handler.
- **Completed during remediation (plan Task 1 line-review finding):** the
  topic `linkNotes`/`linkResources` bulk `UPDATE notes|resources SET topic_id`
  statements lacked the `user_id` filter the report requires — added with a
  regression test (`tests/unit/topic-link-tenant-filter.test.ts`, written
  failing-first).
- **Line-review outcome (Task 5 structural test):** the shipped guard set had
  25 more unguarded junction writers than the assessment enumerated (note
  link/unlink goal+task, resource linkToTask/unlinkFromTask/unlinkFromGoal,
  project unlinkFromGoal, contact unlink×4, note replaceNotebooks, task
  permanentDelete + backfillStaleStatuses ×3). All closed with guards and
  userId threading.
- **Evidence:** `tests/unit/note-junction-idor-validation.test.ts` (9 cases,
  updated to guarded behavior), `tests/security/junction-writers-structural.test.ts`
  (junction inventory derived from migrations; every junction writer guarded;
  `note_related_notes` recorded as the single RLS-only no-writer exception),
  `tests/security/link-endpoint-error-normalization.test.ts`.

### Finding 2 — Encoded-identifier scope + permanent-delete bypass (Medium, CVSS 6.5) — CLOSED in code

- **Fix (verified, then shipped):** `normalizeApiV1Path` URL-decodes each
  segment before the UUID test; `isPermanentDeletePath` structurally treats
  any `DELETE /api/v1/<entity>/<id>` on a destructive entity as permanent
  delete regardless of encoding.
- **Fail-closed layer (plan Task 3):** `enforceApiKeyRoutePermission` now
  denies unmapped routes with 403 `SCOPE_DENIED` for every key mode
  (`src/lib/api/authorize-scope.ts`); the coverage checker proves all 73 data
  routes are mapped, so no existing API-key flow changed.
- **Evidence:** `tests/unit/authorize-scope.test.ts` (15 cases incl. vuln-0002
  regressions), `tests/security/api-key-differential.test.ts` — 8 entities ×
  3 key modes × plain/%2D-encoded/slug × GET/PATCH/DELETE (216 cells) driven
  through the real route handlers and real authorization stack: encoded ≡
  plain, slugs fail closed, DELETE always 403, no denied cell ever 2xx.
  Wired as a permanent CI job (`security-harness`) alongside the
  route-permission map coverage gate.
- **Fail-without-patch proof:** reverting the decode change makes 2
  regression tests fail; removing a junction guard makes the structural test
  fail (both demonstrated on this branch, then restored).

### Finding 3 — Google OAuth client secret in public git history (Medium, CVSS 5.3) — RUNBOOK, owner execution required

- Verified on this branch: 4 `GOCSPX-` occurrences remain in full history
  (introduced in `ecc2dd0`, `cd6291f`); working tree is clean.
- **Runbook:** `docs/security/2026-09-secret-rotation-runbook.md` —
  rotate/delete the credential FIRST, explicit owner go-ahead for the
  force-push, `git filter-repo` purge, fresh-clone verification
  (`git log --all -p | grep -c GOCSPX-` must print 0), OAuth log audit,
  secret scanning + push protection. **Not executed** — rotation is a Google
  Cloud Console action and the purge/force-push is destructive and
  outward-facing.

## Recommendation coverage (report items 1–12 + retest)

| # | Item | Task(s) | State |
| --- | --- | --- | --- |
| 1 | Rotate leaked secret + purge history | 2 | Runbook `2026-09-secret-rotation-runbook.md`; owner executes |
| 2 | Ship the two applied fixes | 0–1 | Done — `bb19075` (+fix-up commits), suite green |
| 3 | Fail-closed permission layer + differential harness | 3–4 | Done — `ee1bac5`, `053c9fb` |
| 4 | Clear test debt (guarded IDOR tests, structural check, live RLS matrix) | 5 | Done — `436a377`; nightly matrix scheduled (`security-nightly.yml`), secrets pending owner config |
| 5 | Kill the existence oracle | 6 | Done — `7b783c8` (parity + FK-race mapping, non-FK errors still 500) |
| 6 | Identity hygiene (GoTrue signup, RPC gate) | 8 | Migration `20260913000001` committed (`8faff19`); dashboard step in `identity-hygiene-runbook.md` |
| 7 | knowledge-search 500 on topic match | 7 | Done — `871afbd`, regression test written failing-first |
| 8 | Clerk JWT gateway verification | 9 | Runbook `clerk-jwt-gateway-verification.md`; owner executes |
| 9 | Nonce-based CSP | 10 | Done — `da3b98a`; per-request nonce via `src/proxy.ts`, `script-src` without `'unsafe-inline'` verified on the production build |
| 10 | Cron timing-safe secret + dispatch isolation | 11 | Done — `249f35e`, 7 tests |
| 11 | Upstream hardening batch | 12 | Done — `998df12` (SHA pins, cert ignore; spawnSync argv + log untrack verified already-safe) |
| 12 | MCP delete-tool docs | 13 | Done — `c0df0de` |
| — | Full retest + closure report | 14 | This report |

## Retest matrix results (run on this branch, final state)

- Full test suite: **191 files / 1687+ tests, 0 failures** (final counts in
  the commit trail; `tsc --noEmit` clean; eslint clean on touched files).
- Differential permission harness: **216/216 cells pass** (deny paths never
  2xx; encoded ≡ plain; slugs fail closed; permanent delete dashboard-only).
- Route-permission map coverage: **73/73 data routes mapped, 0 missing.**
- Junction structural guard: all junction writers guarded; inventory derived
  from 109 migrations.
- Dual-user junction attack matrix + live RLS spot matrix: implemented as
  `scripts/security/rls-matrix.ts` (synthetic GoTrue users, real JWTs,
  victim-side readback, verified teardown) — requires a synthetic-user
  environment; scheduled nightly and owner-runnable
  (`docs/security/rls-matrix.md`). Not executed here (no such environment is
  reachable from this session; production is off-limits by plan constraint).
- Secret-history verification: blocked on owner rotation + purge (runbook
  step 4 re-run).

## Deviations from the plan (all recorded in the SureForge ledger)

1. The repo was found at `/home/maverick/Work/SaaS/sophionos-core` on branch
   `feature/network-map` with the fixes uncommitted atop broader in-progress
   work; shipped as logical conventional commits on the plan's branch
   `security/remediation-2026-09`.
2. Baseline suite was not green (14 failures in 5 files: stale mocks against
   the new guards, a TDZ bug in an in-progress test edit, stale-signature
   IDOR tests). All repaired as part of Tasks 1/5; suite green before each
   subsequent commit.
3. The working tree carried extra hardening beyond the two assessed fixes
   (contact image upload validation chain, proxy open-redirect sanitization,
   account-deletion TOCTOU claim). Reviewed, shipped as separate conventional
   commits (`349e103`, `e26d430`, and the image hardening inside `bb19075`),
   and covered by the suite.
4. The differential harness runs in-process against real route handlers
   (CI needs no credentials) rather than against a locally started dev
   instance; the security boundary under test — the authorization stack — is
   exercised un-mocked.
5. `provision_subscription()` is argument-less in the real schema; the gating
   migration adapts the plan's `uuid` sketch to the real signature, with the
   billing-flip sequencing requirement documented in the migration header.

## Open items (none in agent scope)

1. Owner: rotate/delete the exposed Google OAuth client, then purge history
   (runbook) — until then treat the credential as compromised.
2. Owner: disable GoTrue email signup on production (runbook).
3. Owner: deploy this branch, with the RPC-gate migration shipped together
   with the billing flip.
4. Owner: Clerk JWT gateway verification (runbook) — closes the assessment's
   only open verification item.
5. Owner: configure `RLS_MATRIX_*` secrets for the nightly matrix job.
6. Deploy gate: full suite green on this branch (evidence above) — deploy is
   the owner's pipeline action.
