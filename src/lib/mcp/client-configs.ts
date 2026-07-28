/**
 * Pure MCP client config builders for Settings → MCP and docs parity.
 * Shared stdio payload: npx -y @sophionos/mcp-server + env keys.
 */

export const MCP_PACKAGE = "@sophionos/mcp-server";
export const MCP_SERVER_ID = "sophionos";
export const MCP_COMMAND = "npx";
export const MCP_ARGS = ["-y", MCP_PACKAGE] as const;

export type McpClientId =
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "codex"
  | "antigravity"
  | "opencode"
  | "generic";

export type McpConfigKind = "json" | "cli" | "toml" | "opencode-json";

export interface McpStdioServer {
  command: string;
  args: string[];
  env: {
    SOPHIONOS_API_KEY: string;
    SOPHIONOS_API_URL: string;
  };
}

export interface McpClientDef {
  id: McpClientId;
  label: string;
  description: string;
  configKind: McpConfigKind;
  /** Typical config path or command surface — not certified. */
  pathHint: string;
  afterPasteHint: string;
  build: (apiKey: string, baseUrl: string) => string;
}

/** Shared stdio server definition used by JSON hosts. */
export function buildStdioServer(apiKey: string, baseUrl: string): McpStdioServer {
  return {
    command: MCP_COMMAND,
    args: [...MCP_ARGS],
    env: {
      SOPHIONOS_API_KEY: apiKey,
      SOPHIONOS_API_URL: baseUrl,
    },
  };
}

/** Claude Desktop / Cursor / Antigravity / Generic: mcpServers.sophionos JSON. */
export function buildMcpServersJson(apiKey: string, baseUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        [MCP_SERVER_ID]: buildStdioServer(apiKey, baseUrl),
      },
    },
    null,
    2,
  );
}

/** Claude Code CLI add form. */
export function buildClaudeCodeCommand(apiKey: string, baseUrl: string): string {
  return `claude mcp add ${MCP_SERVER_ID} --env SOPHIONOS_API_KEY=${apiKey} --env SOPHIONOS_API_URL=${baseUrl} -- ${MCP_COMMAND} ${MCP_ARGS.join(" ")}`;
}

/**
 * OpenAI Codex config.toml shape per developers.openai.com/codex/mcp
 * (stdio: [mcp_servers.<id>] with command, args, env).
 */
export function buildCodexToml(apiKey: string, baseUrl: string): string {
  return [
    `[mcp_servers.${MCP_SERVER_ID}]`,
    `command = "${MCP_COMMAND}"`,
    `args = [${MCP_ARGS.map((a) => `"${a}"`).join(", ")}]`,
    `env = { "SOPHIONOS_API_KEY" = "${apiKey}", "SOPHIONOS_API_URL" = "${baseUrl}" }`,
  ].join("\n");
}

/**
 * OpenCode local MCP shape per opencode.ai/docs/mcp-servers
 * (mcp.<name>: type local, command array, environment).
 */
export function buildOpenCodeConfig(apiKey: string, baseUrl: string): string {
  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        [MCP_SERVER_ID]: {
          type: "local",
          command: [MCP_COMMAND, ...MCP_ARGS],
          enabled: true,
          environment: {
            SOPHIONOS_API_KEY: apiKey,
            SOPHIONOS_API_URL: baseUrl,
          },
        },
      },
    },
    null,
    2,
  );
}

/** Ordered client matrix for Settings UI (design-locked order). */
export const MCP_CLIENTS: readonly McpClientDef[] = [
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    description: "Anthropic Claude Desktop app",
    configKind: "json",
    pathHint:
      "claude_desktop_config.json — macOS: ~/Library/Application Support/Claude/; Windows: %APPDATA%\\Claude\\",
    afterPasteHint: "Restart Claude Desktop so SophionOS tools appear in the tools menu.",
    build: buildMcpServersJson,
  },
  {
    id: "claude-code",
    label: "Claude Code",
    description: "Claude Code terminal CLI",
    configKind: "cli",
    pathHint: "Terminal — run once in any shell with Claude Code installed",
    afterPasteHint: "Run the command, then start a new Claude Code session if tools do not appear.",
    build: buildClaudeCodeCommand,
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "Cursor IDE MCP settings",
    configKind: "json",
    pathHint: "~/.cursor/mcp.json (or project .cursor/mcp.json)",
    afterPasteHint: "Reload MCP in Cursor (or restart) after saving the file.",
    build: buildMcpServersJson,
  },
  {
    id: "codex",
    label: "Codex",
    description: "OpenAI Codex CLI / IDE",
    configKind: "toml",
    pathHint: "~/.codex/config.toml (or project .codex/config.toml)",
    afterPasteHint:
      "Merge into config.toml, then restart Codex or use /mcp to confirm the server is active.",
    build: buildCodexToml,
  },
  {
    id: "antigravity",
    label: "Antigravity",
    description: "Google Antigravity IDE",
    configKind: "json",
    pathHint:
      "~/.gemini/config/mcp_config.json (or workspace .agents/mcp_config.json) — also via MCP Store → View raw config",
    afterPasteHint: "Refresh MCP servers in Antigravity or restart the IDE after saving.",
    build: buildMcpServersJson,
  },
  {
    id: "opencode",
    label: "OpenCode",
    description: "OpenCode CLI / app",
    configKind: "opencode-json",
    pathHint: "opencode.json / opencode.jsonc (global or project)",
    afterPasteHint:
      "Merge the mcp.sophionos block into your OpenCode config, then restart OpenCode.",
    build: buildOpenCodeConfig,
  },
  {
    id: "generic",
    label: "Other (generic MCP)",
    description: "Any stdio MCP-compatible host",
    configKind: "json",
    pathHint:
      "Any host that accepts an MCP stdio server with command, args, and env",
    afterPasteHint:
      "Adapt the mcpServers.sophionos block to your client's schema if it differs, then restart the client.",
    build: buildMcpServersJson,
  },
] as const;

export function getMcpClient(id: McpClientId): McpClientDef {
  const found = MCP_CLIENTS.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Unknown MCP client id: ${id}`);
  }
  return found;
}

export const CANONICAL_MCP_CLIENT_LINE =
  "Connect SophionOS to Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client.";
