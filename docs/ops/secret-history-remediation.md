# Secret history remediation note

**Date:** 2026-07-16  
**Scanner:** gitleaks v8.30.1  
**Scope:** full `git` history + working tree (tracked export)

## Finding (high confidence)

| Field | Value |
|-------|--------|
| Rule | `generic-api-key` |
| Path | `supabase/config.toml` |
| Commit | `ecc2dd0f6e021ddd64f51ff3322b8b7b33807316` |
| Kind | Google OAuth client secret (`GOCSPX-…`) plus a committed OAuth `client_id` |
| Status in **current tree** | **Removed** — Google external auth disabled; placeholders use `env(GOOGLE_CLIENT_ID)` / `env(GOOGLE_CLIENT_SECRET)` |

## Required operator action (rotation)

1. In Google Cloud Console, **revoke/rotate** the OAuth client secret that matched the historical value.
2. If the OAuth client is unused for SophionOS (app auth is **Clerk**, not Supabase Auth Google), delete the client credentials entirely.
3. Do **not** re-commit real OAuth secrets. Use local env substitution only for Supabase local Auth experiments.

## History rewrite

A full history rewrite (`git filter-repo` / BFG) was **not** performed: it requires explicit owner approval and a force-push to all remotes. Residual risk:

- The old secret string may still exist in **git history** of this repository until rewrite + force-push (or a clean public export).
- Treat the historical secret as **compromised** regardless of tree cleanup.

## Working-tree scan notes

Untracked local files (`.env.local`, `.next/`, agent worktrees) may contain live keys and must never be committed. They are gitignored. CI secret scanning runs on the checkout only.

## Claims

Public docs **do not** claim a clean git history. They claim: current tree has no committed live secrets; CI scans PRs; operators must rotate any secret that ever appeared in history.
