import { PolicyMeta } from "@/components/trust/policy-meta";
import { Sparkles } from "lucide-react";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Data & AI | SophionOS",
  description: "How MCP, API keys, and AI clients access SophionOS.",
};

export default function DataAndAiPage() {
  return (
    <TrustPage
      icon={Sparkles}
      title="Data & AI"
      description="How MCP, API keys, and AI clients access your data."
    >
      <PolicyMeta
        version="2.2"
        effective="October 25, 2026"
        summary="Adds your own provider key (Settings → AI Providers) and the optional AI-written brief summaries: what is sent, when, and how to turn it off."
      />

      <h2>Default behavior</h2>
      <p>
        SophionOS does not call OpenAI, Anthropic, or any other model host with
        your notes. There is no background job that ships your workspace to a
        model. Connecting an AI client is always an explicit action you take,
        with a key you create.
      </p>
      <p>
        We do not train models on your workspace content, and we do not use it to
        improve a model that anyone else runs.
      </p>

      <h2>Your own provider key (brief summaries)</h2>
      <p>
        Separately from MCP clients, you can connect your own AI provider API
        key in <a href="/settings/ai-providers">Settings → AI Providers</a> and
        turn on AI summaries in Settings → Notifications. When a scheduled
        brief is due and this is enabled, SophionOS sends your chosen provider
        one request containing exactly the data the emailed brief already
        carries — stat counts, top task titles, and goal titles with progress.
        Nothing else is sent, no other feature calls the model, and if the
        provider is unavailable the standard brief is sent instead.
      </p>
      <p>
        The request runs under your provider account, so that provider&apos;s
        terms apply to it. Turn it off any time by toggling AI summaries off or
        disconnecting the provider; your key is stored encrypted and is never
        shown again after you save it.
      </p>

      <h2>Connection flow</h2>
      <ol>
        <li>Create an API key in Settings → AI Access (default: read-only).</li>
        <li>
          Configure your MCP client (Claude Desktop, Claude Code, Cursor, Codex,
          Antigravity, OpenCode, or any MCP-compatible client) with the base
          URL and the key.
        </li>
        <li>
          The client calls the SophionOS REST API. SophionOS enforces
          authentication, access mode, scopes, and your AI-access flags on every
          request.
        </li>
        <li>
          Revoke the key, or use &ldquo;Disable all AI access&rdquo;, to cut off
          further requests immediately.
        </li>
      </ol>

      <h2>Access modes</h2>
      <ul>
        <li>
          <strong>Read-only</strong>: query context; cannot create, update, or
          delete.
        </li>
        <li>
          <strong>Write-limited</strong>: create and update selected entities;
          no permanent delete or archive-class actions.
        </li>
        <li>
          <strong>Write-enabled</strong>: broader writes including archive;
          permanent delete remains dashboard-only, so no API key or MCP client
          can hard-delete your data.
        </li>
      </ul>
      <p>
        Manage connections in{" "}
        <a href="/settings/ai-access">Settings → AI Access</a> (signed in).
      </p>

      <h2>Who is responsible for what</h2>
      <p>
        Once a client is connected, two things are true at once, and it is worth
        being precise about the boundary:
      </p>
      <ul>
        <li>
          <strong>SophionOS is responsible for</strong> what it serves and
          refuses: authenticating the key, enforcing the mode and scopes,
          isolating your rows, honouring a revoked key, and keeping the activity
          record.
        </li>
        <li>
          <strong>You and your client are responsible for</strong> what leaves
          SophionOS. The client and its model provider process whatever they send
          under their own terms, in their own jurisdictions. We cannot see,
          instruct, audit, or delete data held by that provider.
        </li>
      </ul>
      <p>
        That means the privacy policy of the assistant you use matters as much as
        ours. If an AI provider&apos;s terms allow training on inputs, that
        applies to whatever you let it read.
      </p>

      <h2>What an AI client cannot do</h2>
      <ul>
        <li>It cannot permanently delete your data, whatever its write mode.</li>
        <li>
          It cannot keep working after you revoke its key or disable AI access;
          the next request is rejected.
        </li>
        <li>
          It cannot act while global AI access is disabled, even with a valid
          key.
        </li>
        <li>
          It cannot exceed the rate limit of your plan; it will get a 429.
        </li>
      </ul>

      <h2>Prompt injection and tool abuse</h2>
      <p>
        The API and MCP server are experimental. If you import untrusted content
        into your workspace (for example a note containing text that looks like
        instructions), an AI client reading that note may treat it as
        instructions. This is a property of AI clients, not a bug we can patch
        from our side. Keep write-enabled keys away from untrusted content, and
        prefer read-only keys for assistants that browse or import.
      </p>

      <h2>Your rights over data already shared</h2>
      <p>
        You can export your data and delete your account from{" "}
        <a href="/settings/privacy">Settings → Privacy &amp; data</a> at any
        time. Deleting your account removes it from SophionOS; it does not reach
        into a third-party provider that already received a copy, because we
        never held that copy. See <a href="/privacy">Privacy</a> for the full
        picture.
      </p>
      <p className="text-sm text-muted-foreground">
        This page is product documentation, not legal counsel.
      </p>
      <p>
        Related: <a href="/privacy">Privacy</a> ·{" "}
        <a href="/security">Security</a> · <a href="/subprocessors">Subprocessors</a>{" "}
        · <a href="/terms">Terms</a>
      </p>
    </TrustPage>
  );
}
