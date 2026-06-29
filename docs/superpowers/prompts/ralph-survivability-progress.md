# Ralph progress: production survivability hardening

Branch: `feat/prod-survivability-hardening` (cut off `04e3b7c`).
Goal script: `docs/superpowers/goals/2026-06-29-production-survivability-hardening.ps1`
Run on Windows: `pwsh` is NOT installed → use
`powershell -NoProfile -ExecutionPolicy Bypass -File <script>`.

## Master baseline (iteration 1, commit 04e3b7c)
- `tsc --noEmit`: exit 0
- `vitest run` (full): exit 0 (all pass)
- `next build`: exit 0
Any NEW failure vs this baseline is mine to fix.

## Findings status
- [x] **C1 Error boundaries** — `b1ba3a9`
  - `src/app/global-error.tsx` (root, own `<html>/<body>`, reset button)
  - `src/components/route-error.tsx` (shared on-brand client error UI)
  - `src/app/(dashboard)/error.tsx`
  - `src/app/(dashboard)/goals/[id]/error.tsx`
  - `src/app/(dashboard)/projects/[id]/error.tsx`
  - `src/app/(dashboard)/areas/[id]/error.tsx`
  - Verify: tsc 0, eslint changed files clean, next build 0.
- [x] **H1 Resilient composition (allSettled)** — `c23c7f8`
      dashboard / goal-detail / project-detail / area-detail loaders. Independent
      sources → allSettled; dependent hydrate chains kept Promise.all.
      Degradation test: `src/lib/queries/dashboard.queries.test.ts`.
- [x] **C2 Progress rollups to SQL** — `3f5d118`
      migration `20260629120000_progress_summary_rpcs.sql` defines
      `goal_progress_summary` + `project_progress_summary` (SECURITY DEFINER,
      RLS-scoped via `auth.jwt() ->> 'sub'`). goal.service + project.service call
      `.rpc(...)` and map via pure `mapGoalProgressSummary` /
      `mapProjectProgressSummary`. Mapping test: `progress-summary.test.ts`.
      Threaded `.rpc()` into 5 affected service test mocks.
- [x] **M2 Pagination** — `2abd117`
      optional trailing `{ offset, limit }` arg → `.range(offset, offset+limit-1)`
      on task / project / resource / contact `list()`; falls back to
      `LIST_SAFETY_CAP` when no page requested. No call-site breakage.
- [x] **H2 Backfill batching** — already PASS at baseline (no work needed).

## Out-of-loop (leave for human, don't regress)
M3 error-handler trust-boundary, L1 junction one-sided WITH CHECK, L2 CSP
`unsafe-inline`, L3 Sentry, L4 `server-only` for admin.ts.

## Probe note ([8] RALPH_DB_PROBE=1) — UNSATISFIABLE BY DESIGN
Line 141 greps the migrations dir for the ABSENT literal `p_user_id uuid`.
Two hits remain in the dated history file `20260605000000_add_task_recurrence.sql`
(the original recurring-RPC overloads). Migrations are append-only/forward-only,
so a forward `DROP FUNCTION` cannot erase that text from an old file → the static
grep stays red no matter what. The check is a weak PROXY for the live `\df`
(finding M1); it is NOT loop work. Real risk is verified zero (see M1 below).

## Manual step (finding M1) — VERIFIED CLOSED 2026-06-30
Live `\df` against the DEPLOYED DB (Supabase SQL Editor; CLI `db query --linked`
is blocked by a Management-API 403 on this account) returned exactly:
- `complete_recurring_task(p_task_id uuid, p_next_due_date date, p_next_status task_status)`
- `undo_complete_recurring_task(p_completed_task_id uuid, p_spawned_task_id uuid)`
NO `p_user_id` overload survives. The legacy priv-esc function was dropped by
`20260623000000_fix_recurring_rpc_clerk_auth.sql`. Security risk = zero.

## DB migration drift (resolved 2026-06-30, commit 8cb2e74)
`db push` failed "remote migration versions not found locally": the
`20260626000000`/`...0001` previous_status migrations were pushed to remote from
the orphaned `feat-refinements` worktree but never merged to master. Copied both
(idempotent `ADD COLUMN IF NOT EXISTS`) into local history + committed, then
`db push` applied the C2 RPC migration `20260629120000` to remote (RC 0).

## FINAL SUMMARY
- C1 error boundaries — `b1ba3a9`
- H1 allSettled degradation — `c23c7f8`
- C2 progress rollups to SQL (applied to remote) — `3f5d118`
- M2 opt-in pagination — `2abd117`
- H2 backfill batching — already PASS at baseline (no work)
- DB drift sync — `8cb2e74`
No-probe goal gate: PASS (tsc 0, vitest 1125, next build 0).
Probe goal gate: `[8]` static grep unsatisfiable by forward-only work; the risk
it proxies is verified zero via the live `\df` (M1, above).
Out-of-loop for the human: M3, L1, L2, L3, L4 (unchanged, not regressed).
