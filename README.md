# SophionOS

SophionOS is an open-source, self-hostable **connected-context system** for
areas, goals, projects, tasks, notes, resources, topics, and contacts.

It helps you connect what you are doing with what you know, so context can
follow you across personal workflows—and, when you explicitly enable it,
compatible API/MCP clients—under revocable credentials.

## Status

**Public Alpha (`0.1.x`).** Core personal workflows are usable for evaluation
and self-host experiments. REST API and MCP integrations are **experimental**
(not production-ready). Read `docs/known-limitations.md` before relying on this
build for sensitive production data.

This is **not** claimed to be enterprise-secure, fully private in every
deployment, or feature-complete.

## Why SophionOS?

Most tools store projects, notes, and people in separate silos. SophionOS links
them in one personal system with Row Level Security isolation per user.

## What is included today

- Next.js app: areas, goals, projects, tasks, notes, resources, topics, contacts
- Supabase Postgres schema + migrations and RLS policies
- Clerk authentication with JWT forwarded into Supabase
- Settings for preferences and API keys
- Personal data **export** (`GET /api/v1/user/export`)
- Experimental REST API (`/api/v1/*`) and MCP package (`packages/mcp-server`)
- Synthetic demo seed for local evaluation

## What is not included yet (or not stable)

- Production-hardened multi-tenant Cloud operations
- Full API-key **scopes** matrix and guaranteed MCP read-only defaults
- Comprehensive multi-user RLS CI in every environment
- SophionOS Business / Company Brain features
- Bundled Clerk/Supabase in Docker (app image only; external identity + DB)

## License

Apache License 2.0 — see `LICENSE`.  
Trademarks are separate — see `TRADEMARKS.md`.

## Self-hosting

Yes. You operate:

- **Clerk** (identity)
- **Supabase** (Postgres + RLS; local or hosted)
- This Next.js app

You own backups, secrets, upgrades, TLS, and compliance for your deployment.
Guide: **`docs/self-hosting.md`**.

## External services required

| Service | Role |
|---------|------|
| Clerk | Sign-in / JWT identity |
| Supabase | Database, RLS |
| Optional: billing webhook secret | Only if you wire billing |

## AI / MCP data path

SophionOS does **not** silently send your notes to a model provider by default.

If you create an API key and connect an MCP/AI client:

1. The **client** (e.g. Claude Desktop) holds the key and decides what to send
   to **its** model provider.
2. SophionOS receives authenticated API calls and returns **your** data per
   authorization and rate limits.
3. You can revoke keys anytime in Settings.

Details: `docs/privacy-and-data.md`, `docs/mcp.md`, `docs/api.md`.

## Sophion Cloud vs open source

| Open SophionOS | Sophion Cloud (commercial) |
|----------------|----------------------------|
| Core app + schema + self-host path | Managed hosting, backups, updates |
| Export / deletion under your control | Operated reliability and support |
| Experimental API/MCP you run yourself | Managed connectivity (when offered) |

Basic export, deletion, and key revocation are **not** Cloud-only trust features.

## Quick start (local)

```bash
# Prerequisites: Node 22+, pnpm 9+, Clerk + Supabase projects
cp .env.example .env.local
# Edit .env.local with your keys (placeholders only in .env.example)

pnpm install
# Apply migrations (local Supabase example):
npx supabase start
npx supabase db reset

pnpm dev
# App: http://app.localhost:3000 (see docs/self-hosting.md for host routing)
```

Optional demo data: `pnpm seed:demo` (synthetic only — see `supabase/seed.sql`).

### Docker evaluation

```bash
docker compose build
docker compose up
# http://localhost:3000 — set real Clerk/Supabase env first (see .env.example)
```

## Contributing

See `CONTRIBUTING.md`. Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`,
and `pnpm build` before PRs.

## Security

Report vulnerabilities privately — **`SECURITY.md`**. Do not file public issues
for security findings.

## Documentation map

| Doc | Topic |
|-----|--------|
| `docs/self-hosting.md` | Local and self-host setup |
| `docs/architecture.md` | Layers, auth, RLS |
| `docs/data-model.md` | Entities and ownership |
| `docs/privacy-and-data.md` | Data processors, export, deletion |
| `docs/security-model.md` | Boundaries and threat notes |
| `docs/api.md` | REST API status |
| `docs/mcp.md` | MCP status |
| `docs/known-limitations.md` | Honest alpha limits |
| `docs/deployment.md` | Deploy and upgrades |
| `docs/testing.md` | How we test |
| `SUPPORT.md` | Where to ask for help |
| `GOVERNANCE.md` | Decision process |
| `CHANGELOG.md` | Release notes |
