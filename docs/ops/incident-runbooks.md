# Incident runbooks (trust / privacy / AI)

Each runbook: **contain → preserve evidence → assess impact → communicate → remediate → regression test**.

## 1. API key leaked or posted publicly

1. User or ops: Settings → AI Access → Revoke key (or Disable all AI access).
2. Rotate any secondary secrets if the leak includes env material.
3. Review `audit_events` for that `api_key_id` after last known good time.
4. Notify affected user; recommend new key + client reconfig.
5. Regression: revoked key returns 401 on next request.

## 2. Suspected cross-tenant / RLS exposure

1. Enable operator write kill switch if writes are involved: `SOPHION_DISABLE_API_KEY_WRITES=true`.
2. Preserve logs and request IDs; do not mass-delete audit trails.
3. Verify RLS policies and API-key filters by `user_id`.
4. Patch + dual-user tests; communicate if user data was accessed.
5. Regression: user A cannot list B keys/activity/export/deletion.

## 3. Malicious or unintended MCP write

1. User: Disable all AI access (revokes keys).
2. Review activity timeline; reverse changes from dashboard if possible.
3. Leave key write-disabled until user re-enables intentionally.
4. Regression: read_only key cannot POST/PATCH/DELETE.

## 4. Billing entitlement mismatch

1. Check `subscriptions` vs Clerk/billing provider state.
2. Prefer customer-facing portal fix; avoid silent tier elevation.
3. Audit manual entitlement changes.
4. Regression: free user cannot mint keys / call gated routes.

## 5. Export link / file exposure

1. Treat export JSON as private; ask user to rotate if shared.
2. Expire/delete `data_export_jobs` rows past retention.
3. Confirm export contains no key_hash/raw keys.
4. Regression: export assertion tests; SESSION_REQUIRED for export POST.

## 6. Account deletion failure

1. Inspect `account_deletion_requests` status/failure_code.
2. Re-run finalize after fixing missing tables/permissions.
3. Ensure keys remain revoked and AI access off.
4. Communicate honest backup retention.
5. Regression: finalize planner clears user-scoped tables in order.

## 7. Third-party provider outage / breach

1. Status communication via status channel when available.
2. Contain SophionOS side (kill switch, revoke if keys compromised at provider).
3. Follow provider guidance; update subprocessors page if lasting change.
