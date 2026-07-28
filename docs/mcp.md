# MCP (Model Context Protocol)

## Status: **experimental** (public alpha)

The package `packages/mcp-server` talks to SophionOS over the experimental REST
API using an API key. It is **not** production-ready.

## Secure configuration principles

1. Create a dedicated API key with a clear label (e.g. “Cursor laptop” or “Claude Desktop”).
2. Prefer short expiry when available.
3. Store the raw key only in the client’s secret storage.
4. Revoke immediately if a device is lost or a prompt injection is suspected.
5. Do not share keys across untrusted tools.

## Data flow

```text
AI client (MCP host)
   → MCP server (packages/mcp-server)
      → HTTPS REST /api/v1 (Bearer sop_…)
         → SophionOS server auth + rate limit
            → Your database rows
```

SophionOS does not control what the AI client or model provider retains.

## Destructive tools

Some tools can archive or delete data (with confirm flags in places). Treat MCP
as **full account power** for practical purposes until fine-grained scopes ship.

## Supported clients

“Supported” means **documented for evaluation**, not certified.

Documented matrix (same order as Settings → MCP):

1. **Claude Desktop** — `mcpServers.sophionos` JSON in `claude_desktop_config.json`
2. **Claude Code** — `claude mcp add …` with `SOPHIONOS_API_KEY` / `SOPHIONOS_API_URL`
3. **Cursor** — `mcpServers` JSON in `~/.cursor/mcp.json`
4. **Codex** — `[mcp_servers.sophionos]` in `config.toml` (stdio `command` / `args` / `env`)
5. **Antigravity** — same `mcpServers` JSON (typical path under `~/.gemini/config/`)
6. **OpenCode** — local `mcp.sophionos` entry in `opencode.json` (`type: "local"`, `command` array, `environment`)
7. **Other (generic MCP)** — shared stdio payload for any MCP-compatible host

Canonical product line: connect SophionOS to **Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client**.

Transport: stdio via `npx -y @sophionos/mcp-server`. Env:

| Variable | Required | Notes |
| --- | --- | --- |
| `SOPHIONOS_API_KEY` | yes | `sop_…` from Settings → AI Access |
| `SOPHIONOS_API_URL` | no | Instance origin for self-hosted; defaults to cloud SaaS |

Copyable configs live in-app (Settings → MCP, Pro) and in
`packages/mcp-server/README.md`. Builders: `src/lib/mcp/client-configs.ts`.

## Disabling access

Revoke the key in Settings → AI Access / API keys. Disconnect the MCP server from the client.

## Roadmap toward “stable”

- Server-enforced scopes and read-only defaults
- Permanent delete disabled by default for MCP
- Broader automated authz tests
- Published threat notes for prompt injection

Until then, label remains **experimental** everywhere (README, limitations, UI
copy should not claim production MCP).
