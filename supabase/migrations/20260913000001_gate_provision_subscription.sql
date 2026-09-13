-- Identity hygiene (security assessment recommendation 6, plan Task 8):
-- gate provision_subscription so only the billing webhook's service role can
-- call it. Until now any authenticated user (Clerk session or GoTrue JWT)
-- could self-provision a subscription row — harmless only while billing
-- enforcement still defaults everyone to pro; the moment billing flips the
-- default tier to free, an open RPC would be a free-tier bypass.
--
-- SEQUENCING REQUIREMENT (billing-flip PR checklist):
--   This migration MUST be deployed in the same release as the billing
--   enforcement flip that changes the default tier to free. Do not apply it
--   standalone: provisioning is legitimately callable by authenticated users
--   until the flip lands, and revoking it early breaks first-run
--   provisioning for existing flows that still rely on it.
--
-- The real function takes no arguments (user id derives from auth.jwt());
-- revoke from anon, authenticated, and the implicit PUBLIC grant, then
-- re-grant service_role so the billing webhook keeps working.

REVOKE EXECUTE ON FUNCTION public.provision_subscription() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provision_subscription() FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_subscription() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.provision_subscription() TO service_role;
