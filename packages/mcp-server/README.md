# @sophionos/mcp-server

**Status: working today.** Connect [SophionOS Core](https://sophionos.com) to Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client. Your AI assistant gets structured tools for your tasks, goals, projects, notes, resources, contacts, and more. The tool list can still change, and founding members help shape it.

The server wraps the SophionOS Core REST API. Your existing AI model handles the natural language; this server handles the structured data operations against your SophionOS account. The client paths below are documented and working, but not certified for every host version. Core is permanently free and open source (AGPL-3.0-or-later) with no SophionOS plans or billing of its own.

## Prerequisites

1. A SophionOS Core account.
2. A SophionOS **API key** — create one in **SophionOS → Settings → AI Access** (or **Settings → MCP**). Keys start with `sop_`. Copy it when shown; it is only displayed once.

## Configuration

The server reads two environment variables:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SOPHIONOS_API_KEY` | yes | — | Your SophionOS API key (`sop_…`). |
| `SOPHIONOS_API_URL` | no | `https://app.sophionos.com` | Base origin of your SophionOS instance (no trailing slash). |

On startup the server validates the key with `GET /api/v1/mcp/health`. A 200
means the key is valid and the account has an active `pro`/`lifetime`/`max`
entitlement; 401 means invalid/revoked; 403 `TIER_REQUIRED` means the key is
valid but the account has no paid entitlement, so the server refuses to start.
See `docs/known-limitations.md` before self-hosting.

## Setup

In-app snippets (Settings → MCP) use the same shapes as below. Paths are
**typical**, not certified for every host version.

### Claude Desktop

Add to your `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`,
Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sophionos": {
      "command": "npx",
      "args": ["-y", "@sophionos/mcp-server"],
      "env": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

Restart Claude Desktop. The SophionOS tools appear in the tools menu.

### Claude Code

```bash
claude mcp add sophionos --env SOPHIONOS_API_KEY=sop_your_key_here --env SOPHIONOS_API_URL=https://app.sophionos.com -- npx -y @sophionos/mcp-server
```

### Cursor

Add to `~/.cursor/mcp.json` (or the project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sophionos": {
      "command": "npx",
      "args": ["-y", "@sophionos/mcp-server"],
      "env": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

### Codex

Add to `~/.codex/config.toml` (or project `.codex/config.toml`). Stdio servers use a `[mcp_servers.<name>]` table:

```toml
[mcp_servers.sophionos]
command = "npx"
args = ["-y", "@sophionos/mcp-server"]
env = { "SOPHIONOS_API_KEY" = "sop_your_key_here", "SOPHIONOS_API_URL" = "https://app.sophionos.com" }
```

See [OpenAI Codex MCP docs](https://developers.openai.com/codex/mcp) for current options.

### Antigravity

Google Antigravity uses the same `mcpServers` JSON shape. Typical path:
`~/.gemini/config/mcp_config.json` (or workspace `.agents/mcp_config.json`). You can also open **MCP Store → Manage MCP Servers → View raw config**.

```json
{
  "mcpServers": {
    "sophionos": {
      "command": "npx",
      "args": ["-y", "@sophionos/mcp-server"],
      "env": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

### OpenCode

OpenCode uses a dedicated `mcp` object (not `mcpServers`). Merge into `opencode.json` / `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sophionos": {
      "type": "local",
      "command": ["npx", "-y", "@sophionos/mcp-server"],
      "enabled": true,
      "environment": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

See [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers).

### Other (generic MCP)

Any host that supports stdio MCP can adapt the shared payload:

```json
{
  "mcpServers": {
    "sophionos": {
      "command": "npx",
      "args": ["-y", "@sophionos/mcp-server"],
      "env": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

### Self-hosted SophionOS

Set `SOPHIONOS_API_URL` to your instance origin (no trailing slash). The examples above already show the env key; for cloud SaaS you may omit it and rely on the default `https://app.sophionos.com`.

## Tools

**66 tools** across every SophionOS module, counted from `registerTool` calls
in `packages/mcp-server/src/tools/` on this tree: core 16, knowledge 27,
links 12, parity 11. The tool list can still change and founding members help
shape it; this is the authoritative list for this version.

**Core PARA** (`tools/core.ts`, 16)

- `list_areas`, `create_area`, `archive_area`, `restore_area`, `list_goals`,
  `get_goal_detail`, `create_goal`, `update_goal`, `list_projects`, `get_project`,
  `create_project`, `update_project`, `list_tasks`, `create_task`, `update_task`,
  `complete_task`

**Knowledge, contacts and system** (`tools/knowledge.ts`, 27)

- `list_notes`, `get_note`, `create_note`, `update_note`, `save_resource`,
  `list_resources`, `list_topics`, `create_topic`, `list_contacts`,
  `create_contact`, `log_interaction`, `link_contact_to_project`, `search`,
  `knowledge_search`, `get_dashboard`, `get_my_day`, `get_inbox`,
  `list_notebooks`, `list_note_types`, `bulk_archive_notes`,
  `bulk_delete_notes`, `bulk_update_note_status`, `get_contact_log_history`,
  `get_contact_groups`, `get_contacts_grouped_by_area`,
  `get_contacts_grouped_by_goal`, `get_dashboard_activity`

**Links and notebooks** (`tools/links.ts`, 12)

- `add_note_to_notebook`, `remove_note_from_notebook`, `set_note_notebooks`,
  `get_related_notes`, `link_area`, `unlink_area`, `archive_entity`,
  `restore_entity`, `link_contact_to_task`, `update_resource`, `update_topic`,
  `update_contact`

**Entity parity** (`tools/parity.ts`, 11)

- `get_entity`, `delete_entity`, `link_goal`, `unlink_goal`, `link_project`,
  `unlink_project`, `link_task`, `unlink_task`, `unlink_contact_from_project`,
  `unlink_contact_from_task`, `update_area`

**Data safety:** permanent delete is dashboard-only. The API rejects every
permanent delete from API keys and MCP with `403 PERMANENT_DELETE_DISABLED`
(`delete_entity`, `bulk_delete_notes` included, by design). Use the archive
tools (`archive_area`, `archive_entity`, `bulk_archive_notes`) to hide
records reversibly, or delete permanently in the web dashboard.

**Access limits:** keys use access-mode presets (`read_only`, `write_limited`,
`write_enabled`) defined in the Core API; per-key scopes are not enforced
today, and the startup probe enforces the account tier. See
`docs/known-limitations.md` and `docs/mcp.md` for the exact behavior.

### Example prompts

- "Create a task called Review pitch deck, high priority, due Friday."
- "What are my tasks for today?"
- "Complete the pitch deck task."
- "Show me the Fundraising goal details."
- "Save this article as a resource and tag it under React."
- "Who's on the Website Redesign project?"
- "What's in my inbox?"

## How it works

- **Transport:** stdio (works with all local MCP clients).
- **Auth:** your API key travels in an `Authorization` header as a Bearer
  token. SophionOS resolves it to your account server-side and applies
  row-level security — the server never sees your password or session.
- **Scope:** every tool acts only on your own data, within the key's access
  mode and the account's tier. Permanent delete via a key is always blocked;
  see `docs/known-limitations.md`.

## Development

```bash
pnpm install
pnpm build        # tsc → dist/
pnpm typecheck    # tsc --noEmit
pnpm start        # run dist/index.js (needs env vars)
```

Source layout:

```
src/
  index.ts        stdio entry point
  server.ts       McpServer factory; registers all tools
  auth.ts         config resolution + startup key validation
  client.ts       typed REST client (all /api/v1 endpoints)
  tools/core.ts   Areas / Goals / Projects / Tasks tools
  tools/knowledge.ts  Notes / Resources / Topics / Contacts / Search / system tools
  utils.ts        tool-result + error helpers
  types.ts        envelope types + SophionOSApiError
```

## License

AGPL-3.0-or-later — see the repository `LICENSE` and `packages/mcp-server/package.json`.
