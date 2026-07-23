# MCP client matrix (settings + docs) — Design

**Date:** 2026-07-23  
**Status:** Approved for implementation planning (product design signed off in session)  
**Branch context:** `feat/dashboard-analytics-remove-telemetry` (copy/UI work can land on current branch or a follow-up branch)

## Problem

Settings → MCP currently markets SophionOS as connecting to **“Claude or Cursor”** in the primary consent card, while:

1. The page header already says “any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, and more.”
2. Package README documents Claude Desktop, Claude Code, Cursor, and Codex.
3. In-app setup snippets only cover **Claude Desktop** and **Claude Code**.

This understates product capability, confuses users on non-Anthropic hosts, and leaves Cursor/Codex/OpenCode/Antigravity without first-class in-app install paths.

## Goals

1. **Canonical messaging:** SophionOS connects to **Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client**.
2. **Full client matrix in Settings → MCP (Pro):** Tabbed (or select-on-mobile) install UI with per-client copyable config.
3. **Docs parity:** `packages/mcp-server/README.md` and `docs/mcp.md` match the matrix and keep **experimental** status.
4. **Adjacent copy alignment:** AI Access empty states, privacy/data-and-ai mentions, key name placeholders — not Claude-only.
5. **Maintainable builders:** Pure functions for config generation, unit-tested; one shared stdio payload where schemas match.

## Non-goals

- New MCP transports (HTTP/SSE/OAuth) beyond current `@sophionos/mcp-server` stdio model.
- Live per-client “connected” detection or health probes.
- Brand logos / trademark assets (text labels only).
- Auto-injecting the user’s raw API key into snippets from AI Access (keys remain create-once on AI Access; UI keeps `sop_your_key_here` placeholder unless a future flow reveals a key on this page).
- Claiming production readiness or host certification (MCP remains **experimental**).

## Current state (as-built)

| Location | Behavior |
|----------|----------|
| `src/app/(dashboard)/settings/mcp/page.tsx` | Header: broad MCP client wording (Claude Desktop/Code, Cursor, and more). |
| `src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx` | Consent title: “Connect SophionOS to Claude or Cursor”; Pro snippets: Claude Desktop JSON + Claude Code CLI only; builders `buildClaudeDesktopConfig` / `buildClaudeCodeCommand` inline. |
| `packages/mcp-server/README.md` | Claude Desktop, Claude Code, Cursor, Codex mention; Cursor JSON documented; no OpenCode/Antigravity. |
| `docs/mcp.md` | Experimental; “supported” = documented for evaluation; no named matrix. |
| Related UI | `ai-access-card`, privacy page, create-key placeholders lean Claude/Cursor. |

Transport today: stdio via `npx -y @sophionos/mcp-server` with env `SOPHIONOS_API_KEY` (required) and `SOPHIONOS_API_URL` (optional, instance origin).

## Design

### 1. Canonical product copy

**Primary line (use consistently):**

> Connect SophionOS to Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client.

**Secondary (privacy / consent — keep intent, expand clients only):**

- Creating a key is for the AI client the user chooses.
- Default access: read SophionOS context (projects, tasks, goals, research as applicable).
- Writes require explicit enablement on the key and AI Access settings.

**Claude naming:**

- Headline may say **Claude** once.
- Install matrix splits **Claude Desktop** and **Claude Code** (different install UX).

### 2. Shared config module

Extract pure builders from the settings component into a focused module, e.g.:

`src/lib/mcp/client-configs.ts`

Responsibilities:

- Export a typed catalog of clients: `id`, `label`, `description`, `configKind`, `pathHint`, `afterPasteHint`, `build(apiKey, baseUrl)`.
- Shared stdio server definition used by JSON hosts:

```ts
{
  command: "npx",
  args: ["-y", "@sophionos/mcp-server"],
  env: {
    SOPHIONOS_API_KEY: apiKey,
    SOPHIONOS_API_URL: baseUrl,
  },
}
```

- Client-specific wrappers:
  - **Claude Desktop / Cursor / Antigravity / Generic:** wrap in `{ "mcpServers": { "sophionos": … } }` pretty-printed JSON (Antigravity uses the same `mcpServers` shape; path differs).
  - **Claude Code:** existing CLI string with `--env` flags.
  - **Codex:** use currently documented Codex MCP registration (CLI and/or config file). If official format differs from Claude JSON at implementation time, document the accurate format; never invent a host schema. Prefer linking to Codex docs in the tab footer if the format is unstable.
  - **OpenCode:** dedicated builder for OpenCode’s `mcp` config shape in `opencode.json` (local/command style per OpenCode docs — **not** a blind paste of `mcpServers`).
  - **Other (generic MCP):** same as Desktop `mcpServers` JSON + short prose that any stdio MCP host can adapt.

Default placeholders in UI: `sop_your_key_here` and runtime `baseUrl` from `window.location.origin` (existing pattern).

### 3. Settings UI — client matrix

**Consent card**

- Title → canonical primary line (or shortened title + description carrying the full list).
- Keep CTAs: Continue with read-only access → `/settings/ai-access`; Review → `/data-and-ai`.

**Setup card (Pro only, existing gate)**

- Title: e.g. “Connect your AI client”.
- Description: create key in AI Access, then choose client and copy config.
- **Tabs** on `md+`; **native `<select>` or Select component** on small screens listing all clients.
- Client order:

  1. Claude Desktop  
  2. Claude Code  
  3. Cursor  
  4. Codex  
  5. Antigravity  
  6. OpenCode  
  7. Other (generic MCP)

- Tab panel content:
  - Label + path/command hint
  - Monospace `<pre>` of built config
  - Copy button (reuse existing copy + toast pattern)
  - After-paste note (restart client / reload MCP)
- Footer: “Works with any client that supports stdio MCP servers.”

**Connection status / AI Access cards:** no behavioral change required; optional one-line copy tweak to say “AI client” generically.

**Component structure (suggested):**

- Keep page shell in `page.tsx` (header description → canonical line).
- `McpSettingsContent` orchestrates subscription gate + cards.
- Optional presentational `McpClientMatrix` for tabs + active snippet (keeps content file smaller).

Use existing shadcn primitives (`Tabs` if present in the project; otherwise minimal button-group tabs). Prefer project patterns over new dependencies.

### 4. Docs alignment

**`packages/mcp-server/README.md`**

- Intro paragraph → canonical client list.
- Setup sections for each matrix client (mirror in-app builders).
- Keep self-hosted `SOPHIONOS_API_URL` note.

**`docs/mcp.md`**

- Expand “Supported clients” to name the documented set + “any MCP-compatible host.”
- Explicitly: documented for evaluation, not certified; status remains experimental.

### 5. Adjacent product copy

Update strings that hard-limit clients:

| Area | Direction |
|------|-----------|
| `src/components/settings/ai-access-card.tsx` empty state | Full client set or “any MCP-compatible client” |
| `src/app/privacy/page.tsx` (and data-and-ai if needed) | Same |
| API key create placeholders / examples | Mix examples: Cursor, OpenCode, Claude Desktop, Codex — not Claude-only |
| Settings hub card if it mentions only two clients | Align if present |

Do not rewrite entire privacy policy; only client-list sentences.

### 6. Testing

- Unit tests for pure builders (snapshot or string equality):
  - Shared env keys present
  - Claude Desktop / Cursor / Antigravity / Generic produce valid JSON with `mcpServers.sophionos`
  - Claude Code command contains `claude mcp add` and both env vars
  - OpenCode builder matches agreed schema shape
  - Codex builder matches agreed documented shape
- Manual smoke: Settings → MCP as Pro: each tab copies; Free: no snippet card, upgrade CTA still works.
- Grep gate: no remaining product claim of only “Claude or Cursor” in user-facing MCP onboarding.

### 7. Implementation order

1. Add `client-configs` module + unit tests (TDD preferred).
2. Wire client matrix UI + consent/header copy in MCP settings.
3. Align AI Access / privacy / placeholder strings.
4. Update package README + `docs/mcp.md`.
5. Grep + manual verification.

### 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Host config formats change (Codex, OpenCode, Antigravity paths) | Document paths as “typical”; verify against official docs during implementation; generic tab always works for stdio |
| OpenCode schema differs from Claude | Dedicated builder; never reuse Desktop JSON blindly |
| Page length / cognitive load | Tabs + one active snippet; do not stack all pre blocks |
| Over-promising support | Keep experimental language; “documented” ≠ “certified” |

## Success criteria

- [ ] Consent card and page header no longer imply only Claude/Cursor.
- [ ] Pro users see seven client entries with correct copyable config for each.
- [ ] Builders are pure, shared, and unit-tested.
- [ ] README and `docs/mcp.md` list the same matrix and experimental status.
- [ ] Adjacent empty states / privacy one-liners are consistent.
- [ ] No new transport or connection-probe scope creep.

## Open implementation notes (resolve during plan, not blockers)

1. Confirm whether `Tabs` already exists under `src/components/ui`.
2. Confirm Codex current install command/config from official docs at code time.
3. Confirm OpenCode local MCP entry fields (`type`, `command`, `environment`, etc.) from official docs at code time.
4. Antigravity config path variants (`mcp_config.json` locations) — show the most common path + “or via MCP Store → View raw config.”

## References

- In-app: `src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx`, `page.tsx`
- Package: `packages/mcp-server/README.md`, `packages/mcp-server/src/index.ts` (stdio)
- Product constraints: `docs/mcp.md` experimental status
