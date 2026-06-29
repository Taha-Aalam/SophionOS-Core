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
- [x] **C1 Error boundaries** — `<SHA-C1>`
  - `src/app/global-error.tsx` (root, own `<html>/<body>`, reset button)
  - `src/components/route-error.tsx` (shared on-brand client error UI)
  - `src/app/(dashboard)/error.tsx`
  - `src/app/(dashboard)/goals/[id]/error.tsx`
  - `src/app/(dashboard)/projects/[id]/error.tsx`
  - `src/app/(dashboard)/areas/[id]/error.tsx`
  - Verify: tsc 0, eslint changed files clean, next build 0.
- [ ] **H1 Resilient composition (allSettled)** — dashboard / goal-detail /
      project-detail / area-detail `.queries.ts`. Only convert INDEPENDENT
      sources; keep `Promise.all` where a later step depends on results.
      Needs a partial-failure degradation TEST.
- [ ] **C2 Progress rollups to SQL** — new migration `YYYYMMDDHHMMSS_*.sql`
      defining `goal_progress_summary()` + `project_progress_summary()`,
      RLS-scoped to `auth.jwt() ->> 'sub'`. goal.service + project.service
      call `.rpc(...)`. Needs an RPC-mapping TEST.
- [ ] **M2 Pagination** — add optional `.range(offset, offset+limit-1)` to
      unbounded lists in task / project / resource / contact services.
- [x] **H2 Backfill batching** — already PASS at baseline (no work needed).

## Out-of-loop (leave for human, don't regress)
M3 error-handler trust-boundary, L1 junction one-sided WITH CHECK, L2 CSP
`unsafe-inline`, L3 Sentry, L4 `server-only` for admin.ts.

## Probe note ([8] RALPH_DB_PROBE=1)
`[FAIL] no active CREATE FUNCTION still takes a client-supplied p_user_id` —
a migration still has `CREATE FUNCTION ... p_user_id uuid`. Investigate which
migration; the priv-esc guard wants the legacy overload DROPPED, not recreated.

## Manual step that CANNOT be automated (finding M1)
Run `\df complete_recurring_task` / `\df undo_complete_recurring_task` against
the DEPLOYED DB and confirm no `p_user_id` overload survives.
