// Audit sophionos-core-20261117-r1 finding F4
// (supabase/config.toml@git-history-oauth-client-secret, medium): a
// live-format Google OAuth client secret remains recoverable from git
// history reachable from master and every release tag — the cd6291f
// remediation was tree-only and
// docs/security/2026-09-secret-rotation-runbook.md is still Status: NOT
// EXECUTED.
//
// Fails (exit 1) while any commit reachable from any local ref still
// contains the leaked-secret fingerprint, so the regression is caught
// before AND after the runbook's filter-repo purge. Counts and hashes
// only — the secret value itself is never emitted.
//
// Wiring: intentionally `continue-on-error: true` in ci.yml until the
// purge lands (the check fails on the current history by design); flip it
// to blocking as the final runbook step.
import { execSync } from "node:child_process";

const PATTERN = "GOCSPX-";
const FILE = "supabase/config.toml";

const commits = execSync(`git rev-list --all -- ${FILE}`, { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const hits = [];
for (const commit of commits) {
  const blob = execSync(`git show ${commit}:${FILE}`, { encoding: "utf8" });
  if (blob.includes(PATTERN)) hits.push(commit);
}

if (hits.length > 0) {
  console.error(
    `leaked-secret fingerprint still reachable from published refs in: ${hits.join(", ")}`,
  );
  console.error(
    "Execute docs/security/2026-09-secret-rotation-runbook.md (rotate first, then filter-repo purge + force-push all refs), then flip this step to blocking.",
  );
  process.exitCode = 1;
} else {
  console.log("git history clean of leaked-secret fingerprint");
}
