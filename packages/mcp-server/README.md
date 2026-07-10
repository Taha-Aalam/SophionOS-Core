# @sophionos/mcp-server

Connect [SophionOS Core](https://sophionos.com) to any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, Codex, or any future MCP host. Your AI assistant gets structured tools for your tasks, goals, projects, notes, resources, contacts, and more.

The server wraps the SophionOS Core REST API. Your existing AI model handles the natural language; this server handles the structured data operations against your SophionOS account.

## Prerequisites

1. A SophionOS Core account.
2. A SophionOS **API key** — create one in **SophionOS → Settings → MCP** (or **Settings → API Keys**). Keys start with `sop_`. Copy it when shown; it is only displayed once.

## Configuration

The server reads two environment variables:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SOPHIONOS_API_KEY` | yes | — | Your SophionOS API key (`sop_…`). |
| `SOPHIONOS_API_URL` | no | `https://app.sophionos.com` | Base origin of your SophionOS instance (no trailing slash). |

On startup the server validates the key against `GET /api/v1/user/settings`. An invalid or revoked key makes the server refuse to start with a clear error.

## Setup

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
        "SOPHIONOS_API_KEY": "sop_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The SophionOS tools appear in the tools menu.

### Claude Code

```bash
claude mcp add sophionos --env SOPHIONOS_API_KEY=sop_your_key_here -- npx -y @sophionos/mcp-server
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
        "SOPHIONOS_API_KEY": "sop_your_key_here"
      }
    }
  }
}
```

### Self-hosted SophionOS

Set `SOPHIONOS_API_URL` to your instance origin:

```json
{
  "mcpServers": {
    "sophionos": {
      "command": "npx",
      "args": ["-y", "@sophionos/mcp-server"],
      "env": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://sophionos.yourcompany.com"
      }
    }
  }
}
```

## Tools

33 tools across every SophionOS module.

**Core PARA**
- Areas — `list_areas`, `create_area`, `archive_area`, `restore_area`
- Goals — `list_goals`, `get_goal_detail`, `create_goal`, `update_goal`
- Projects — `list_projects`, `get_project`, `create_project`, `update_project`
- Tasks — `list_tasks`, `create_task`, `update_task`, `complete_task`

**Knowledge**
- Notes — `list_notes`, `get_note`, `create_note`, `update_note`
- Resources — `save_resource`, `list_resources`
- Topics — `list_topics`, `create_topic`
- Search — `search` (all entities), `knowledge_search` (notes + resources + topics)

**Contacts**
- `list_contacts`, `create_contact`, `log_interaction`, `link_contact_to_project`

**System**
- `get_dashboard` (today), `get_my_day`, `get_inbox`

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
- **Auth:** your API key travels as `Authorization: Bearer sop_…`. SophionOS resolves it to your account server-side and applies row-level security — the server never sees your password or session.
- **Scope:** every tool acts only on your own data.

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

MIT
