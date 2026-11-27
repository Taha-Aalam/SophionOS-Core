# MCP (Model Context Protocol)

## Status: working today

The `packages/mcp-server` package talks to SophionOS over the REST API with an
API key. It registers 66 tools today. The tool list can still change and
founding members help shape it; while the project is at `0.x`, tool names and
parameters are not a frozen contract. See `docs/known-limitations.md` for the
concrete limits.

Core is permanently free and open source. Core itself has no SophionOS plans or
billing; the tier gate described below is Cloud-oriented code carried in the
self-hosted tree.

## Secure configuration principles

1. Create a dedicated API key with a clear label (e.g. "Cursor laptop" or "Claude Desktop").
2. Prefer short expiry when available.
3. Store the raw key only in the client's secret storage.
4. Revoke immediately if a device is lost or a prompt injection is suspected.
5. Do not share keys across untrusted tools.

## Data flow

```text
AI client (MCP host)
   → MCP server (packages/mcp-server)
      → HTTPS REST /api/v1 (Bearer sop_…)
         → SophionOS server auth + tier check + rate limit
            → Your database rows
```

SophionOS does not control what the AI client or model provider retains.

## Concrete limits today

- **Scopes**: keys use one of three access-mode presets — `read_only`,
  `write_limited`, `write_enabled` (`src/lib/api/api-scopes.ts`). The per-key
  `scopes` column is not enforced; authorization uses the mode preset, and
  unmapped routes fail closed with 403 `SCOPE_DENIED`
  (`src/lib/api/authorize-scope.ts`). Treat a key as broad access within its
  mode, not as a per-tool allowlist.
- **Destructive tools**: `delete_entity` and `bulk_delete_notes` always return
  403 `PERMANENT_DELETE_DISABLED` from a key. Use `archive_entity`,
  `archive_area` or `bulk_archive_notes` for reversible hiding, or delete in
  the dashboard. Other mutation tools are allowed when the key's access mode
  permits them.
- **Tier gate**: the startup probe `GET /api/v1/mcp/health` calls
  `requirePaidTier`; a key without an active `pro`/`lifetime`/`max` row gets
  403 `TIER_REQUIRED` and the server refuses to start. See
  `docs/known-limitations.md` before self-hosting.
- **Key handling**: keys are SHA-256 hashed at rest and shown once at creation
  (`src/lib/api/api-key-service.ts`). The MCP server never sees your password
  or Clerk session.

## Supported clients

"Supported" means documented and working with the shared stdio configuration,
not certified for every host version.

Documented matrix (same order as Settings → MCP):

1. **Claude Desktop** — `mcpServers.sophionos` JSON in `claude_desktop_config.json`
2. **Claude Code** — `claude mcp add …` with `SOPHIONOS_API_KEY` / `SOPHIONOS_API_URL`
3. **Cursor** — `mcpServers` JSON in `~/.cursor/mcp.json`
4. **Codex** — `[mcp_servers.sophionos]` in `config.toml` (stdio `command` / `args` / `env`)
5. **Antigravity** — same `mcpServers` JSON (typical path under `~/.gemini/config/`)
6. **OpenCode** — local `mcp.sophionos` entry in `opencode.json` (`type: "local"`, `command` array, `environment`)
7. **Other (generic MCP)** — shared stdio payload for any MCP-compatible host

Canonical product line: connect SophionOS to **Claude, Codex, Antigravity,
Cursor, OpenCode, or any MCP-compatible AI client**.

Transport: stdio via `npx -y @sophionos/mcp-server`. Env:

| Variable | Required | Notes |
| --- | --- | --- |
| `SOPHIONOS_API_KEY` | yes | `sop_…` from Settings → AI Access |
| `SOPHIONOS_API_URL` | no | Instance origin for self-hosted; defaults to `https://app.sophionos.com` |

Copyable configs live in-app (Settings → MCP) and in
`packages/mcp-server/README.md`. Builders: `src/lib/mcp/client-configs.ts`.

## Disabling access

Revoke the key in Settings → AI Access / API keys. Disconnect the MCP server from the client.

## What can still change

- Tool names, parameters and the tool list itself at `0.x`.
- Scope granularity: per-key scopes and finer read-only defaults are not yet
  enforced; founding members can help shape that.
- Automated authz coverage and published prompt-injection threat notes.

