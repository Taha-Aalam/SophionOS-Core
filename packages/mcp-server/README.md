# @lifeos/mcp-server

Connect [LifeOS Core](https://lifeos.app) to any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, Codex, or any future MCP host. Your AI assistant gets structured tools for your tasks, goals, projects, notes, resources, contacts, and more.

The server wraps the LifeOS Core REST API. Your existing AI model handles the natural language; this server handles the structured data operations against your LifeOS account.

## Prerequisites

1. A LifeOS Core account.
2. A LifeOS **API key** — create one in **LifeOS → Settings → MCP** (or **Settings → API Keys**). Keys start with `lif_`. Copy it when shown; it is only displayed once.

## Configuration

The server reads two environment variables:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `LIFEOS_API_KEY` | yes | — | Your LifeOS API key (`lif_…`). |
| `LIFEOS_API_URL` | no | `https://app.lifeos.app` | Base origin of your LifeOS instance (no trailing slash). |

On startup the server validates the key against `GET /api/v1/user/settings`. An invalid or revoked key makes the server refuse to start with a clear error.

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`,
Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "npx",
      "args": ["-y", "@lifeos/mcp-server"],
      "env": {
        "LIFEOS_API_KEY": "lif_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The LifeOS tools appear in the tools menu.

### Claude Code

```bash
claude mcp add lifeos --env LIFEOS_API_KEY=lif_your_key_here -- npx -y @lifeos/mcp-server
```

### Cursor

Add to `~/.cursor/mcp.json` (or the project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "npx",
      "args": ["-y", "@lifeos/mcp-server"],
      "env": {
        "LIFEOS_API_KEY": "lif_your_key_here"
      }
    }
  }
}
```

### Self-hosted LifeOS

Set `LIFEOS_API_URL` to your instance origin:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "npx",
      "args": ["-y", "@lifeos/mcp-server"],
      "env": {
        "LIFEOS_API_KEY": "lif_your_key_here",
        "LIFEOS_API_URL": "https://lifeos.yourcompany.com"
      }
    }
  }
}
```

## Tools

33 tools across every LifeOS module.

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
- **Auth:** your API key travels as `Authorization: Bearer lif_…`. LifeOS resolves it to your account server-side and applies row-level security — the server never sees your password or session.
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
  types.ts        envelope types + LifeOSApiError
```

## License

MIT
