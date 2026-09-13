# Live RLS matrix — runbook

**What this is.** `scripts/security/rls-matrix.ts` runs the dual-user
isolation matrix that the September 2026 security assessment executed by
hand (57-case live verification) as a repeatable, scheduled script. The
project's in-repo isolation tests are mock-based; this script is the
non-mocked check, so the mock suite is never the only isolation gate.

**What it exercises.** Two synthetic GoTrue users are created and signed in
with real JWTs. For every primary entity table (areas, goals, projects,
tasks, notes, resources, topics, contacts): victim→attacker SELECT, UPDATE
(with attacker-side readback), DELETE (with readback); junction
dual-ownership on representative pairs; anon-key visibility (zero rows).
Every synthetic row and both users are deleted in teardown and removal is
verified before the script exits.

**Environment — read this before running.**

- Point it at a **synthetic-user environment only**: a local
  `supabase start` instance or a dedicated staging project.
- **Never at production.** The script signs up users and writes rows.
- Required variables:

  ```bash
  RLS_MATRIX_SUPABASE_URL=http://127.0.0.1:54321
  RLS_MATRIX_ANON_KEY=<anon key of that env>
  RLS_MATRIX_SERVICE_ROLE_KEY=<service_role key of that env>
  ```

**Run it.**

```bash
pnpm dlx tsx scripts/security/rls-matrix.ts
```

Exit codes: `0` all exercised cases passed; `1` at least one isolation
failure (treat as a launch blocker); `2` misconfiguration. Cases that could
not be seeded (missing OpenAPI definition, table-specific constraint the
filler cannot satisfy) are reported as `SKIP` — visible, not silently
passed. A growing SKIP list on a table that should be reachable is a bug in
the filler, not a pass.

**Schedule.** `.github/workflows/security-nightly.yml` runs the matrix
nightly against the configured staging environment
(`RLS_MATRIX_*` repository secrets). Until the owner configures those
secrets, the job reports itself as skipped-config, not green.

**Synthetic-user hygiene.** Users carry a `synthetic: true` metadata marker
and an `rls-matrix-<timestamp>` marker; teardown removes every row scoped to
the synthetic user ids on all primary and junction tables and deletes both
GoTrue users, then verifies removal. If a run is killed mid-flight, rerun
the script (new markers) and manually delete stray
`@synthetic.invalid` users from the staging environment.
