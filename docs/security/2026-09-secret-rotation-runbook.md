# Owner runbook: rotate the leaked Google OAuth secret and purge git history

**Status: NOT EXECUTED — every step here is owner-side.** The code agent cannot
reach Google Cloud Console, GitHub repo settings, or force-push; the
history rewrite is destructive and the force-push is outward-facing, so both
require explicit owner go-ahead at the marked step.

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

## Execution record (owner fills in)

| Item | Value |
| --- | --- |
| Rotation/deletion date | |
| Force-push approval | |
| Purge date | |
| Fresh-clone `GOCSPX-` count | |
| OAuth log audit window + result | |
| Secret scanning + push protection enabled | |
