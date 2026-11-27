# Known limitations and current status

## Product status (2026-11-27)

- The **hosted product launched on 2026-11-27 and is live in production** at
  `sophionos.com` and `app.sophionos.com`.
- This repository is **SophionOS Core**: the self-hosted, open-source edition.
  Core is permanently free and open source under AGPL-3.0-or-later (`LICENSE`,
  `package.json`). There is no paywall in Core and none is planned. Cloud plans
  and founding seats belong to the hosted service, not to Core.
- No third-party security audit report is published in this repository. Review
  the controls yourself before relying on a self-hosted deployment.

## API and MCP — working today, with concrete limits

The REST API under `/api/v1` and the `packages/mcp-server` package work today.
The tool list can still change, and founding members help shape it. This is not
a promise of a frozen surface: while the project is at `0.x`, routes and tool
names may change without a long deprecation window.

Verified against this tree:

- **Surface**: 90 route files under `src/app/api/v1`. The MCP server registers
  66 tools in four groups (`packages/mcp-server/src/tools/core.ts` 16,
  `knowledge.ts` 27, `links.ts` 12, `parity.ts` 11); `createServer()` in
  `packages/mcp-server/src/server.ts` registers all four. The authoritative
  tool list is the `registerTool` calls in those files.
- **Key handling**: API keys are stored as SHA-256 hashes, displayed once at
  creation, and revocable (`src/lib/api/api-key-service.ts`). A MCP client
  validates its key at startup with `GET /api/v1/mcp/health`
  (`packages/mcp-server/src/auth.ts`, `packages/mcp-server/src/client.ts`).
  Treat a key like a password: anyone holding it can act as you within the
  enabled access mode until you revoke it.
- **Scope granularity**: three access-mode presets are enforced — `read_only`
  (12 scopes), `write_limited` (15) and `write_enabled` (21) — defined in
  `src/lib/api/api-scopes.ts`. The per-key `scopes` column is not enforced yet;
  authorization uses the mode preset (`src/lib/api/authorize-scope.ts`). A key
  reaching a route with no permission-map entry is denied with 403
  `SCOPE_DENIED` (fail closed). Clerk sessions retain full dashboard authority.
- **Destructive operations**: permanent delete from an API key or MCP is always
  rejected with 403 `PERMANENT_DELETE_DISABLED`
  (`src/lib/api/authorize-scope.ts`). `delete_entity` and `bulk_delete_notes`
  therefore always fail from a key, by design. Use the reversible archive tools
  (`archive_entity`, `archive_area`, `bulk_archive_notes`) or the dashboard.
- **Rate limits**: Postgres shared counters by default; set
  `RATE_LIMIT_STORE=memory` only for tests or a single-process instance
  (`.env.example`).

### The self-host tier gate — read before deploying

What the code does today:

- `authorizeApiRequest` calls `requirePaidTier` for every route it protects
  (`src/lib/api/api-auth.ts`).
- `requirePaidTier` reads the caller's `subscriptions` row and throws
  **403 `TIER_REQUIRED`** with the message "This feature requires a Pro
  subscription." when the tier is not `pro`, `lifetime` or `max`. A missing,
  inactive or unrecognised row — and any lookup failure — resolves to `free`
  (`src/lib/api/subscription.ts`).
- The same check runs in `GET /api/v1/mcp/health`, so a free-tier MCP key is
  refused at connection time, and on `POST /api/v1/user/api-keys`.
- This is a Cloud-oriented entitlement wall carried in the Core code. Migration
  `supabase/migrations/20260913000001_gate_provision_subscription.sql` revoked
  `EXECUTE` on `provision_subscription()` from `authenticated`, so a signed-in
  user cannot self-grant a subscription row. The earlier backfill
  (`supabase/migrations/20260701000002_backfill_pro_subscriptions.sql`) only
  covered users who already had data when it ran.

**No supported off-switch exists today.** There is no environment flag or
shipped procedure in this tree that disables `requirePaidTier` for a
self-hosted instance. Do not assume a manual database edit is a supported
workaround: the provisioning RPC is deliberately restricted and no supported
steps are provided. This is an owner decision to make, not an operator recipe.

## Data layer

- Many UI services read and write Supabase **from the browser** with RLS. That
  is the current architecture, not a temporary accident; server API routes
  inject a server-side client where needed (`docs/architecture.md`).
- `pnpm test:isolation` exercises dual-user isolation across service, export,
  ownership and API-key paths with fixture users.
- Live dual-JWT PostgREST RLS tests are **not** in default CI: they need Clerk
  and Supabase JWTs (`docs/testing.md`). CI runs structural migration and RLS
  presence checks (`pnpm check:migrations`).

## Self-hosting

- The Docker image and Compose file build the **app only**; Clerk and Supabase
  remain external services you configure (`Dockerfile`, `docker-compose.yml`).
- Clerk is required; alternative auth providers are not supported today.
- `NEXT_PUBLIC_*` values are inlined at image build time and cannot be changed
  on a prebuilt image (see `docs/self-hosting.md`).
- You own backups, TLS, upgrades, and secret rotation.

## Privacy and data

- Optional analytics keys may send events if configured.
- Connecting AI clients shares data with those clients and model providers —
  outside SophionOS control.

## Export and deletion

- Export: `GET /api/v1/user/export` and `POST /api/v1/user/data-export` for the
  authenticated user. Junction-table coverage may expand over time.
- Deletion: in-app account-deletion request (grace + finalize) where enabled.
  Operators still own Clerk user removal and backup/log erasure.

## What we will not claim

- "Enterprise secure" or "fully private" for every possible deployment.
- A frozen REST or MCP surface at `0.x` — routes and tool names can change.
- Any plan, cap, billing flow or paywall in Core. Core has none.

