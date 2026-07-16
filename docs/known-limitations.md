# Known limitations (public alpha)

## Product status

- **Alpha, not production-certified.** Expect rough edges, schema evolution, and
  incomplete operator tooling.
- No formal security audit published for this open-source tree.

## API and MCP — experimental

- REST (`/api/v1/*`) and `packages/mcp-server` are **experimental**.
- Do **not** treat them as production-ready multi-tenant API products.
- API keys are hashed and revocable, but **fine-grained scopes** (per entity /
  read-only defaults enforced server-side for every tool) are incomplete.
- MCP tools can perform mutations including destructive operations when the
  underlying API allows them; use carefully and revoke keys after demos.
- Some routes enforce a **paid-tier** check designed for Sophion Cloud-style
  monetization; pure self-hosters must understand or adjust that gate for their
  deployment.

## Data layer

- Many UI services talk to Supabase **from the browser** with RLS. That is an
  intentional early architecture; a full dual-path server repository layer is
  still maturing.
- **Dual-user isolation unit tests** (`pnpm test:isolation`) exercise real
  service/export/ownership/API-key paths with fixture users. **Live** dual-JWT
  PostgREST RLS tests are **not** in default CI (need Clerk + Supabase JWTs).
- CI runs structural migration/RLS presence checks (`pnpm check:migrations`) and
  optional plain-Postgres migration apply (Supabase-specific SQL may skip).

## Self-hosting

- Docker evaluation image/Compose builds the **app** only; Clerk and Supabase
  remain external services you configure (see `Dockerfile`, `docker-compose.yml`).
- Clerk is required; alternative auth providers are **not** supported yet.
- You own backups, TLS, upgrades, and secret rotation.

## Secret history

- A historical Google OAuth secret was found in git history under
  `supabase/config.toml` and removed from the **current tree**. Full history
  rewrite was not applied without owner force-push approval. Operators must
  **rotate** that credential. Details: `docs/ops/secret-history-remediation.md`.

## Privacy

- Optional analytics keys may send events if configured.
- Connecting AI clients shares data with those clients/providers—outside
  SophionOS control.

## Export / deletion

- Export covers core personal entities via `GET /api/v1/user/export`; junction
  coverage may expand over time.
- Full multi-processor legal erasure is an **operator** responsibility (Clerk +
  DB + backups + logs).

## What we will not claim

- “Enterprise secure” without evidence
- “Fully private” for every possible deployment
- “Production MCP” until scopes, defaults, and tests match that bar
