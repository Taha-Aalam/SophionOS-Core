# REST API

## Status: **experimental** (public alpha)

The HTTP API under `/api/v1` is suitable for evaluation and development. It is
**not** advertised as a stable, production-ready public API.

Breaking changes may occur without a long deprecation window while the project
is `0.x`.

## Authentication

| Method | How |
|--------|-----|
| API key | `Authorization: Bearer sop_…` (raw key shown once at creation) |
| Clerk session | Cookie/session via Next.js when calling from the logged-in app |

Server validation: `src/lib/api/api-auth.ts`, key crypto in
`src/lib/api/api-key-service.ts` (SHA-256 hash at rest, expiry, revocation).

## Authorization notes

- Many data routes use `authorizeApiRequest` (auth + paid-tier wall).
- User settings/key management routes use `requireAuth` so free users can manage
  keys/settings in dashboard scenarios.
- Rate limiting: `src/lib/api/rate-limiter.ts`.

## Export

```http
GET /api/v1/user/export
Authorization: Bearer <sop_…>   # or Clerk session
```

Returns JSON personal data for the authenticated user only.

## Stability

| Area | Expectation |
|------|-------------|
| JSON error shape | Best-effort consistency via `api-response` helpers |
| Resource URLs | May change in alpha |
| Pagination params | May change in alpha |
| OpenAPI document | Not yet a guaranteed artifact |

## Security testing expectations

Contributors adding endpoints should cover: unauthenticated access, wrong user
IDs, revoked/expired keys, and rate-limit failure modes where practical.

See also `docs/mcp.md` and `docs/known-limitations.md`.
