# MCP (Model Context Protocol)

## Status: **experimental** (public alpha)

The package `packages/mcp-server` talks to SophionOS over the experimental REST
API using an API key. It is **not** production-ready.

## Secure configuration principles

1. Create a dedicated API key with a clear label (e.g. “Claude Desktop laptop”).
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

Configuration snippets appear in the in-app Settings → MCP UI when running the
app. Officially “supported” means “documented for evaluation,” not certified.

## Disabling access

Revoke the key in Settings → API keys. Disconnect the MCP server from the client.

## Roadmap toward “stable”

- Server-enforced scopes and read-only defaults
- Permanent delete disabled by default for MCP
- Broader automated authz tests
- Published threat notes for prompt injection

Until then, label remains **experimental** everywhere (README, limitations, UI
copy should not claim production MCP).
