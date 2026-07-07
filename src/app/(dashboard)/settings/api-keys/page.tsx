import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function ApiKeysPage() {
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="API Keys"
        description="Create and manage API keys to authenticate your MCP server or direct API calls. Each key is shown once at creation — store it somewhere safe."
      />

      <ApiKeyManager />
    </div>
  );
}
