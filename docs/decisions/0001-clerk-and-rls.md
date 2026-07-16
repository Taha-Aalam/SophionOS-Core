# ADR 0001: Clerk identity + Supabase RLS

## Status

Accepted (as-built).

## Context

SophionOS needs multi-user isolation for sensitive personal context data.
Supabase Auth was considered; the product standardized on Clerk for identity UX
and session management.

## Decision

- Use **Clerk** as the identity provider.
- Store `user_id` as **text** matching Clerk `sub`.
- Configure Supabase to accept Clerk JWTs.
- Enforce isolation with **RLS** policies comparing `auth.jwt()->>'sub'` to
  `user_id`.
- Use the **service role** only on the server for API-key auth and privileged
  operations, always scoping by validated `userId`.

## Consequences

- Self-hosters must operate both Clerk and Supabase.
- Contributors must never ship service-role keys to the browser.
- Alternative auth providers require a new ADR and migration plan.
