import { TrustPageShell } from "@/components/trust/trust-page-shell";

export const metadata = {
  title: "Data & AI | SophionOS",
  description: "How MCP, API keys, and AI clients access SophionOS.",
};

export default function DataAndAiPage() {
  return (
    <TrustPageShell title="Data, AI clients, and MCP">
      <h2>Default behavior</h2>
      <p>
        SophionOS core does not automatically call OpenAI, Anthropic, or other
        model hosts with your notes. Connecting an AI client is always an
        explicit user action.
      </p>
      <h2>Connection flow</h2>
      <ol>
        <li>Create an API key in Settings → AI Access (default: read-only).</li>
        <li>Configure your MCP client with the base URL and key.</li>
        <li>
          The client calls SophionOS REST APIs; SophionOS enforces auth, modes,
          scopes, and your AI-access flags.
        </li>
        <li>Revoke the key or disable AI access to cut off further requests.</li>
      </ol>
      <h2>Access modes</h2>
      <ul>
        <li>
          <strong>Read-only</strong> — query context; cannot create/update/delete.
        </li>
        <li>
          <strong>Write-limited</strong> — create/update selected entities; no
          permanent delete or archive class actions.
        </li>
        <li>
          <strong>Write-enabled</strong> — broader writes including archive;
          permanent delete remains dashboard-only for MCP/API keys.
        </li>
      </ul>
      <p>
        Manage connections in{" "}
        <a href="/settings/ai-access">Settings → AI Access</a> (signed in).
      </p>
    </TrustPageShell>
  );
}
