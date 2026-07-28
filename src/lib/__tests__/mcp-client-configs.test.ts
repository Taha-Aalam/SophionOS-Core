import { describe, expect, it } from "vitest";

import {
  MCP_CLIENTS,
  MCP_PACKAGE,
  buildClaudeCodeCommand,
  buildCodexToml,
  buildMcpServersJson,
  buildOpenCodeConfig,
  buildStdioServer,
  getMcpClient,
} from "@/lib/mcp/client-configs";

const API_KEY = "sop_test_key_abc";
const BASE_URL = "https://app.example.com";

describe("buildStdioServer", () => {
  it("uses npx -y @sophionos/mcp-server and both env keys", () => {
    const server = buildStdioServer(API_KEY, BASE_URL);
    expect(server.command).toBe("npx");
    expect(server.args).toEqual(["-y", MCP_PACKAGE]);
    expect(server.env.SOPHIONOS_API_KEY).toBe(API_KEY);
    expect(server.env.SOPHIONOS_API_URL).toBe(BASE_URL);
  });
});

describe("buildMcpServersJson", () => {
  it("produces valid mcpServers.sophionos JSON with env keys", () => {
    const raw = buildMcpServersJson(API_KEY, BASE_URL);
    const parsed = JSON.parse(raw) as {
      mcpServers: {
        sophionos: {
          command: string;
          args: string[];
          env: Record<string, string>;
        };
      };
    };
    expect(parsed.mcpServers.sophionos.command).toBe("npx");
    expect(parsed.mcpServers.sophionos.args).toEqual(["-y", "@sophionos/mcp-server"]);
    expect(parsed.mcpServers.sophionos.env.SOPHIONOS_API_KEY).toBe(API_KEY);
    expect(parsed.mcpServers.sophionos.env.SOPHIONOS_API_URL).toBe(BASE_URL);
  });

  it("is used by Desktop, Cursor, Antigravity, and Generic clients", () => {
    for (const id of ["claude-desktop", "cursor", "antigravity", "generic"] as const) {
      const client = getMcpClient(id);
      expect(client.build(API_KEY, BASE_URL)).toBe(buildMcpServersJson(API_KEY, BASE_URL));
    }
  });
});

describe("buildClaudeCodeCommand", () => {
  it("includes claude mcp add and both env vars", () => {
    const cmd = buildClaudeCodeCommand(API_KEY, BASE_URL);
    expect(cmd).toContain("claude mcp add sophionos");
    expect(cmd).toContain(`SOPHIONOS_API_KEY=${API_KEY}`);
    expect(cmd).toContain(`SOPHIONOS_API_URL=${BASE_URL}`);
    expect(cmd).toContain("npx -y @sophionos/mcp-server");
  });

  it("matches the catalog builder", () => {
    expect(getMcpClient("claude-code").build(API_KEY, BASE_URL)).toBe(
      buildClaudeCodeCommand(API_KEY, BASE_URL),
    );
  });
});

describe("buildCodexToml", () => {
  it("matches documented [mcp_servers.sophionos] stdio shape", () => {
    const toml = buildCodexToml(API_KEY, BASE_URL);
    expect(toml).toContain("[mcp_servers.sophionos]");
    expect(toml).toContain('command = "npx"');
    expect(toml).toContain('args = ["-y", "@sophionos/mcp-server"]');
    expect(toml).toContain(`"SOPHIONOS_API_KEY" = "${API_KEY}"`);
    expect(toml).toContain(`"SOPHIONOS_API_URL" = "${BASE_URL}"`);
  });

  it("matches the catalog builder", () => {
    expect(getMcpClient("codex").build(API_KEY, BASE_URL)).toBe(
      buildCodexToml(API_KEY, BASE_URL),
    );
  });
});

describe("buildOpenCodeConfig", () => {
  it("matches OpenCode local mcp shape (not mcpServers)", () => {
    const raw = buildOpenCodeConfig(API_KEY, BASE_URL);
    const parsed = JSON.parse(raw) as {
      mcp: {
        sophionos: {
          type: string;
          command: string[];
          enabled: boolean;
          environment: Record<string, string>;
        };
      };
      mcpServers?: unknown;
    };
    expect(parsed.mcpServers).toBeUndefined();
    expect(parsed.mcp.sophionos.type).toBe("local");
    expect(parsed.mcp.sophionos.command).toEqual(["npx", "-y", "@sophionos/mcp-server"]);
    expect(parsed.mcp.sophionos.enabled).toBe(true);
    expect(parsed.mcp.sophionos.environment.SOPHIONOS_API_KEY).toBe(API_KEY);
    expect(parsed.mcp.sophionos.environment.SOPHIONOS_API_URL).toBe(BASE_URL);
  });

  it("matches the catalog builder", () => {
    expect(getMcpClient("opencode").build(API_KEY, BASE_URL)).toBe(
      buildOpenCodeConfig(API_KEY, BASE_URL),
    );
  });
});

describe("MCP_CLIENTS catalog", () => {
  it("exposes seven clients in the required order", () => {
    expect(MCP_CLIENTS.map((c) => c.id)).toEqual([
      "claude-desktop",
      "claude-code",
      "cursor",
      "codex",
      "antigravity",
      "opencode",
      "generic",
    ]);
    expect(MCP_CLIENTS).toHaveLength(7);
  });

  it("each client has pathHint, afterPasteHint, and a non-empty build", () => {
    for (const client of MCP_CLIENTS) {
      expect(client.label.length).toBeGreaterThan(0);
      expect(client.pathHint.length).toBeGreaterThan(0);
      expect(client.afterPasteHint.length).toBeGreaterThan(0);
      const out = client.build(API_KEY, BASE_URL);
      expect(out.length).toBeGreaterThan(10);
      expect(out).toContain(API_KEY);
    }
  });
});
