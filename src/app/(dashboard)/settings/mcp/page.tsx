import { McpSettingsContent } from "./mcp-settings-content";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function McpSettingsPage() {
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="MCP Server"
        description="Connect SophionOS to your AI client via MCP. Create an API key, then paste the config into your client."
      />

      <McpSettingsContent />
    </div>
  );
}
