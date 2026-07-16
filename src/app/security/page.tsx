import { TrustPageShell } from "@/components/trust/trust-page-shell";

export const metadata = {
  title: "Security | SophionOS",
  description: "Practical overview of how SophionOS protects user data.",
};

export default function SecurityPage() {
  return (
    <TrustPageShell title="How SophionOS protects your data">
      <ul>
        <li>
          <strong>Account security</strong> — Clerk authentication and sessions.
        </li>
        <li>
          <strong>Per-user isolation</strong> — Postgres RLS for session access;
          API-key path filters by authenticated user id.
        </li>
        <li>
          <strong>Encryption</strong> — in transit (TLS) and at rest through
          hosting/database providers as configured.
        </li>
        <li>
          <strong>API keys</strong> — stored as cryptographic hashes; shown once;
          revocable; optional expiry; access modes (read-only default for MCP).
        </li>
        <li>
          <strong>AI controls</strong> — global AI disable, write toggles, per-key
          modes, activity audit metadata.
        </li>
        <li>
          <strong>Backups &amp; recovery</strong> — operator/provider dependent;
          not zero-knowledge.
        </li>
      </ul>
      <h2>What we do not claim</h2>
      <ul>
        <li>We cannot read your data (service-role exists for infrastructure).</li>
        <li>Military-grade or zero risk.</li>
        <li>That external AI providers never receive data after you connect a client.</li>
      </ul>
      <p>
        Report vulnerabilities via{" "}
        <a href="/responsible-disclosure">responsible disclosure</a>.
      </p>
    </TrustPageShell>
  );
}
