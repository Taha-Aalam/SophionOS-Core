# Testing

## Stack

- **Vitest** unit/component tests (`pnpm test`)
- **ESLint** (`pnpm lint`)
- **TypeScript** (`pnpm exec tsc --noEmit`)
- **Next build** (`pnpm build`) in CI

## Layout

| Path | Purpose |
|------|---------|
| `tests/unit/**` | Majority of unit/UI tests |
| `src/app/api/v1/**/__tests__` or route-related unit tests | API behavior with mocks |
| `tests/unit/api-key-*.test.ts` | Key routes / crypto helpers |
| `tests/unit/personal-data-export.test.ts` | Export shaping |
| `tests/unit/rls-policy-presence.test.ts` | Structural RLS migration checks |

## Running

```bash
pnpm test
pnpm test -- tests/unit/personal-data-export.test.ts
```

CI sets `RATE_LIMIT_STORE=memory` and `NODE_ENV=test`.

## What we do not fake

Tests should exercise real helpers and routes (with mocked I/O boundaries), not
re-implement production logic inside the test.

## RLS integration gap

Full dual-user RLS tests need live Supabase + Clerk JWTs. When unavailable,
structural tests assert that core migrations define RLS policies. Document any
residual risk in `docs/known-limitations.md`.

## Adding tests

- Prefer pure functions for crypto, export shaping, validators.
- Mock `createAdminClient` / Clerk `auth` at the boundary.
- Cover auth failure and cross-user denial paths for new API surface.
