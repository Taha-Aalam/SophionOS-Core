# Security model

## Trust boundaries

1. **Browser** — untrusted. Receives only anon key + user JWT.
2. **Next.js server** — holds service-role key, Clerk secret, webhook secrets.
3. **Postgres** — RLS enforces per-user isolation for JWT-authenticated clients.
4. **API key path** — server validates key hash, maps to `userId`, then uses
   admin client with **application-level** filters (RLS bypass). Bugs here are
   high severity.
5. **MCP / AI clients** — third-party processes; treat as a powerful device that
   can read whatever scopes/tools the key allows.

## Primary controls

| Control | Status in alpha |
|---------|-----------------|
| Clerk session auth | Implemented |
| RLS on user tables | Implemented in migrations; multi-user CI incomplete in all envs |
| API key hashing (SHA-256), revoke, expiry | Implemented |
| Rate limiting | Implemented (memory or Postgres RPC) |
| Paid tier wall on many `/api/v1` routes | Implemented (Cloud-oriented) |
| Fine-grained API key scopes | **Not complete** — treat keys as broad access |
| MCP permanent-delete restrictions | Partial (confirm flags); **experimental** |
| Full threat model tests for prompt injection | Residual risk |

## Threat notes (selected)

- **Cross-user IDOR** via guessed UUIDs: mitigated by RLS on session path;
  API-key path must always filter by authenticated `userId`.
- **Service-role leak**: bypasses RLS entirely—protect env and never import
  `admin` client into client components (runtime guard exists).
- **Stolen API key**: equivalent to acting as the user for API surface until
  revoked; store keys like passwords; prefer short expiry.
- **AI client exfiltration**: user-enabled; document and revoke.
- **Dependency supply chain**: CI audit + Dependabot; review updates.

## Reporting

See `SECURITY.md`.

## Residual risks (honest)

Public alpha has not completed a formal third-party audit. Full dual-user RLS
integration matrices may not run in every contributor environment without local
Supabase + Clerk JWT fixtures. Structural migration checks and unit tests cover
what this repo can automate without live credentials.
