# Owner runbook: rotate the leaked Google OAuth secret and purge git history

**Status: EXECUTED 2026-11-19** — history purge complete and force-pushed
(owner-approved). Credential disposition: the owning Google Cloud project
was permanently deleted (see execution record); no rotation was possible
or needed. Original procedure preserved below for the record.

**Finding:** report finding 3 (Medium, CVSS 5.3, CWE-798). A real
`GOCSPX-…` client secret sits in `supabase/config.toml` in the public repo's
history. The July 2026 cleanup removed it from the working tree only — the
full history still contains 4 occurrences of the `GOCSPX-` fingerprint,
introduced by commits `ecc2dd0` ("chore: prepare repo for clean GitHub push")
and `cd6291f` ("chore(launch): public-alpha hygiene…"). Remote:
`https://github.com/Taha-Aalam/SophionOS-Core.git` (branches `master`,
`feature/*`, plus 10 tags — push every one of them after the rewrite).

**Sequence matters: rotate first, purge second, audit third.**

---

## Step 1 — Rotate or delete the credential (do this first)

1. Google Cloud Console → **APIs & Services → Credentials**.
2. Find the OAuth client whose client secret matches the exposed
   `GOCSPX-…` value (the client id sits next to it in the leaked
   `supabase/config.toml` revision).
3. Production auth is Clerk, and the exposed client is a
   localhost-callback Supabase-Auth development client — if it is unused,
   **deleting the client is the cleaner option**; otherwise rotate the
   secret.
4. Until this step completes, treat the credential as compromised.
5. Record the rotation/deletion date: `____________________` (fills the
   closure report).

## Step 2 — Get explicit go-ahead for the force-push

The history rewrite rewrites every commit and requires force-pushing all
branches and tags to the public remote. Coordinate with any other clones
first. **Do not proceed to step 3 without an explicit owner decision.**

Decision (owner): ☐ approved, date `________`  ☐ deferred

## Step 3 — Purge the secret from history

Run from a **fresh clone** (not the working machine's repo) so the rewritten
history cannot be contaminated by local state:

```bash
pip install git-filter-repo
git clone https://github.com/Taha-Aalam/SophionOS-Core.git && cd SophionOS-Core
echo 'regex:GOCSPX-[A-Za-z0-9_-]+==>*REMOVED*' > /tmp/replacements.txt
git filter-repo --replace-text /tmp/replacements.txt --force
# filter-repo detaches remotes; re-add and force-push every branch and tag
git remote add origin https://github.com/Taha-Aalam/SophionOS-Core.git
git push origin --force --all && git push origin --force --tags
```

## Step 4 — Verify from a fresh anonymous clone

```bash
cd "$(mktemp -d)" && git clone https://github.com/Taha-Aalam/SophionOS-Core.git && cd SophionOS-Core
git log --all -p | grep -c 'GOCSPX-'   # expect: 0
```

## Step 5 — Audit and prevent recurrence

1. Google Cloud Console → **OAuth logs**: audit from the April 2026 exposure
   date to the rotation date for any token issuance on the exposed client.
   Record the result in the closure report.
2. GitHub repo → **Settings → Code security**: enable secret scanning and
   push protection.
3. All collaborators must **re-clone** (never pull/rebase over a rewritten
   history).

---

## Execution record

| Item | Value |
| --- | --- |
| Rotation/deletion date | No rotation — gate form: owning project permanently deleted, owner-confirmed 2026-11-19. Google Cloud project 1033039659828 (owner of client `1033039659828-j0vt1oel93rko6u718a4qu54ad4jnk4e.apps.googleusercontent.com`) was deleted ~10 months before execution; 30-day recovery window long past; Manage Resources → Resources Pending Deletion rechecked empty 2026-11-19; owner's only Google account for that project. Client and secret permanently dead and unrestorable. |
| Force-push approval | Owner-approved 2026-11-19 (explicit go after pre-push checkpoint: purge verified in mirror before push) |
| Purge date | 2026-11-19 — `git filter-repo --replace-text` (`regex:GOCSPX-[A-Za-z0-9_-]+==>*REMOVED*`) in a fresh mirror clone; `git push --mirror` rewrote all refs |
| Ref counts after purge | 42 branches, 23 tags — names identical to pre-purge manifest, all SHAs rewritten. The 5 secret-bearing commits `ecc2dd0`, `ee89242`, `568087f`, `458d879`, `b48d720` no longer exist (rewritten to `ba3aaff`, `b374d0d`, `9136aeb`, `cb94a29`, `3c3f30a`). Note: pre-purge local clone held 27 tags; 4 (`v0.1.1/.2/.3/.7`) were local-only, never published. |
| Fresh-clone `GOCSPX-` count | Full secret value: **0** across every blob, commit message and tag message reachable from all refs (4,604 blobs scanned in fresh post-push clone). `assert-git-history-clean.mjs`: exit 0. Bare `GOCSPX-` prefix survives only as documentation/regex literals (`.gitleaks.toml`, runbook/closure/ops docs, `tests/unit/no-unpinned-dlx.test.ts`) — zero secret material; a naive `grep -c 'GOCSPX-'` over `git log --all -p` therefore returns 33 (prose/regex lines), not 0. |
| OAuth log audit window + result | Not applicable — owning project deleted; console logs unavailable and credential unrestorable. Exposure window April 2026 → project deletion (~Jan 2026 deletion per owner timeline ~10 months before 2026-11-19). |
| Secret scanning + push protection enabled | Owner-side GitHub setting — not verified in this execution; owner to confirm under Settings → Code security. |
| On-disk scrub | 2026-11-19, pre-purge: `.claude/worktrees/feat-refinements/supabase/config.toml` reset to env-placeholder form (`enabled = false`); one generated turbopack cache file deleted. All other 65,298 files in that worktree verified byte-identical (sha256 manifest). Core tree, Cloud trees and /tmp swept: no other secret-bearing copies (Cloud/tmp hits were docs/regex prose only). |
| Guard flip | `assert-git-history-clean.mjs` CI step flipped to blocking in the final remediation commit; passes (exit 0) on the purged history. |
| Replay verification | 12 remediation commits cherry-picked onto purged master; all 12 patch-ids identical to originals; replayed tree byte-identical to pre-purge branch tree (empty diff). Battery on replay: 2,109/2,109 tests (244 files), isolation 11/11, typecheck clean, lint 0 errors, route-permissions 73/73, migrations OK (115, none added), scope 36 files. |
