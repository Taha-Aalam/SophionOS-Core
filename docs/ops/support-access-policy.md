# Founder / support access policy

## Rules

1. Use **individual** privileged accounts with MFA. Never share production
   credentials in chat or shared password managers without ownership.
2. Default support access is **metadata and diagnostics**, not user note/task
   content.
3. Any production-data investigation requires: ticket id, stated reason,
   time-bound access, and an audit note.
4. Prefer user-provided screenshots or redacted exports before direct content
   access.
5. Revoke temporary elevated access when the ticket closes.
6. Support must **never** request raw API keys, passwords, Clerk session tokens,
   or full private note dumps unless the user voluntarily shares a minimal
   redacted example.

## Logging expectations

- Application logs must not contain Authorization headers, raw `sop_` keys,
  cookies, or full note bodies.
- Prefer request IDs linking to audit_events for forensics.
