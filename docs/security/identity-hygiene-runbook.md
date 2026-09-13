# Owner runbook: identity hygiene (GoTrue signup + provision_subscription gate)

**Status: the migration is committed; the dashboard step and deploy
sequencing are owner-side.** Report recommendation 6, plan Task 8 — two
independent items.

## 1. Disable native GoTrue email signup (production Supabase dashboard)

GoTrue runs alongside Clerk on the production project and lets anyone mint
an authenticated JWT via email signup. RLS blocks those tokens from reading
data today, but the capability need not exist.

1. Supabase dashboard → **Authentication → Sign In / Providers** (or
   **Auth → Settings** on older layouts).
2. Disable **email signups** (disable open signup on the email provider;
   keep the provider itself enabled if Supabase Auth is still used for
   anything — the assessment found no production dependency).
3. Verify: attempt `auth.signUp` with a throwaway email against the
   production URL → must be rejected (signups not allowed).
4. Record the change date in the closure report.

This is a production dashboard change — **not executed by the code agent**.

## 2. Gate the `provision_subscription` RPC (migration committed)

`supabase/migrations/20260913000001_gate_provision_subscription.sql`
revokes `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`, and grants it
to `service_role` so the billing webhook path keeps working. The real
function is argument-less (the user id derives from `auth.jwt()->>'sub'`),
which is why the plan's `provision_subscription(uuid)` sketch was adapted.

**Sequencing requirement (binding):** the migration must deploy in the same
release as the billing-enforcement flip that changes the default tier to
free — the header comment in the migration states this, and the closure
report repeats it. Applying it standalone breaks first-run provisioning for
flows that legitimately rely on the RPC today; leaving it out of the
billing-flip release reopens the self-provision path the flip is meant to
close.

**Post-deploy verification (owner, after both ship):**

1. Authenticated non-service call to `provision_subscription()` → must fail
   with a permission denied error.
2. Billing webhook path (service role) → still provisions.

## Execution record (owner fills in)

| Item | Value |
| --- | --- |
| GoTrue signup disabled (date) | |
| Verification: signup rejected | |
| Billing flip shipped (date/PR) | |
| RPC gate migration deployed (date) | |
| Post-deploy verification results | |
