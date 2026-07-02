import { ApiKeyManager } from "@/components/settings/api-key-manager";

export default function ApiKeysPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">API Keys</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create and manage API keys to authenticate your MCP server or direct
          API calls. Each key is shown once at creation — store it somewhere safe.
        </p>
      </div>

      <ApiKeyManager />
    </div>
  );
}
