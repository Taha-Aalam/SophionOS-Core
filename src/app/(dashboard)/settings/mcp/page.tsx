import { McpSettingsContent } from "./mcp-settings-content";

export default function McpSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">MCP Server</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Connect LifeOS to any MCP-compatible AI client — Claude Desktop,
          Claude Code, Cursor, and more. Create an API key, then paste the
          config into your client.
        </p>
      </div>

      <McpSettingsContent />
    </div>
  );
}
