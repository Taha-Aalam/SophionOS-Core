# REST API

## Status: working today

The HTTP API under `/api/v1` works today (90 route files on this tree). It is
the same API the web app and the MCP server use. While the project is at `0.x`,
routes, JSON shapes and pagination parameters can change without a long
deprecation window; founding members help shape the surface. See
`docs/known-limitations.md` for the concrete limits.

Core is permanently free and open source; it has no SophionOS plans or billing.
Some endpoints carry a Cloud-oriented tier gate (see below).

## Authentication

| Method | How |
|--------|-----|
| API key | `Authorization: Bearer *** (raw key shown once at creation) |
| Clerk session | Cookie/session via Next.js when calling from the logged-in app |

Server validation: `src/lib/api/api-auth.ts`, key crypto in
`src/lib/api/api-key-service.ts` (SHA-256 hash at rest, expiry, revocation).

## Authorization notes

- Most data routes go through `authorizeApiRequest`, which calls
  `requirePaidTier` (`src/lib/api/subscription.ts`). A caller without an active
  `pro`, `lifetime` or `max` row receives 403 `TIER_REQUIRED`.
- User settings and key-management routes use `requireAuth` so account
  housekeeping stays reachable without the API tier gate.
- API keys use three access-mode presets — `read_only`, `write_limited` and
  `write_enabled` (`src/lib/api/api-scopes.ts`). The per-key `scopes` column is
  not enforced today; unmapped routes fail closed with 403 `SCOPE_DENIED`
  (`src/lib/api/authorize-scope.ts`). Permanent deletion from a key always
  returns 403 `PERMANENT_DELETE_DISABLED`.
- Rate limiting: `src/lib/api/rate-limiter.ts`. Use `RATE_LIMIT_STORE=memory`
  only for tests or a single-process install; Postgres counters are the
  default.

## Export

```http
GET /api/v1/user/export
Authorization: Bearer ***   # or Clerk session
```

Returns JSON personal data for the authenticated user only.
`POST /api/v1/user/data-export` is the session-authenticated export path.

## Stability

| Area | Expectation |
|------|-------------|
| JSON error shape | Best-effort consistency via `api-response` helpers |
| Resource URLs | May change while the project is `0.x` |
| Pagination params | May change while the project is `0.x` |
| OpenAPI document | Not yet a guaranteed artifact |

## Security testing expectations

Contributors adding endpoints should cover: unauthenticated access, wrong user
IDs, revoked/expired keys, and rate-limit failure modes where practical.

See also `docs/mcp.md` and `docs/known-limitations.md`.

