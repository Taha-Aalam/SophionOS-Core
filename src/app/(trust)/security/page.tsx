import { PolicyMeta } from "@/components/trust/policy-meta";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Security | SophionOS",
  description: "Practical overview of how SophionOS protects user data.",
};

export default function SecurityPage() {
  return (
    <TrustPage
      emoji="🛡️"
      title="Security"
      description="How SophionOS protects your data."
    >
      <PolicyMeta
        version="2.1"
        effective="October 19, 2026"
        summary="Replaces the previous security page. Adds the minimum safeguards required by Rule 6 of the DPDP Rules, 2025, and a clear separation between what SophionOS Cloud provides and what a self-hosted deployment does not."
      />

      <h2>What we do</h2>
      <ul>
        <li>
          <strong>Account security</strong>: authentication and sessions are
          handled by Clerk, including session revocation on sign-out. We never
          store your password.
        </li>
        <li>
          <strong>Per-user isolation</strong>: Postgres row-level security
          enforces that a session sees only its own user&apos;s rows. The
          API-key path filters every query by the authenticated user id. Plan
          and entitlement checks are server-side and fail closed: a missing or
          inactive subscription resolves to <code>free</code>.
        </li>
        <li>
          <strong>Encryption in transit</strong>: all traffic is served over
          TLS, and a per-request nonce-based Content Security Policy restricts
          what scripts the app will execute.
        </li>
        <li>
          <strong>Encryption at rest</strong>: provider-side encryption on
          their storage layer, plus application-level field-level encryption of
          your personal content. In SophionOS Cloud, note bodies, contact
          details, and the descriptions and saved links on your areas, goals,
          projects, tasks, and resources are encrypted with AES-256-GCM before
          they are written to the database. This is always on for every Cloud
          account, and the key never reaches the browser. It is not end-to-end
          encryption; the server holds the key.
        </li>
        <li>
          <strong>API keys</strong>: stored only as cryptographic hashes, shown
          once at creation, revocable, with optional expiry, per-key labels and
          scopes, and a read-only default posture for MCP.
        </li>
        <li>
          <strong>AI controls</strong>: a global AI-access switch, a separate
          write-access switch, per-key write modes, and activity metadata you
          can review. Revoking a key rejects subsequent requests immediately.
        </li>
        <li>
          <strong>Logging and visibility</strong>: security and access logs,
          retained for at least one year, so that unauthorised access can be
          detected, investigated, and remediated.
        </li>
        <li>
          <strong>Backups &amp; recovery</strong>: Cloud takes provider-backed
          backups. They are not zero-knowledge: the operator holds the
          encryption key, so the contents of a backup are readable by us.
        </li>
        <li>
          <strong>Operator access</strong>: production credentials are held by
          the founder/operator and used for incident response, a support
          escalation you initiate, or legal process. Support will never ask for
          raw API keys, passwords, session tokens, or a full dump of your notes.
        </li>
      </ul>

      <h2>India: minimum safeguards under Rule 6, DPDP Rules 2025</h2>
      <p>
        Where the DPDP Rules, 2025 apply, Rule 6 requires a Data Fiduciary to
        take, at minimum, the following measures. Where they apply to you, we
        meet them as follows:
      </p>
      <table>
        <thead>
          <tr>
            <th>Rule 6 requirement</th>
            <th>How we meet it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Encryption, obfuscation, masking, or virtual tokens for personal
              data
            </td>
            <td>
              TLS in transit, provider-side encryption at rest, AES-256-GCM
              field-level encryption of personal content, hashed API keys, and
              per-user row isolation.
            </td>
          </tr>
          <tr>
            <td>Access control on computer resources</td>
            <td>
              Clerk sessions, row-level security, server-side entitlement
              checks, and operator credentials limited to named individuals.
            </td>
          </tr>
          <tr>
            <td>Visibility on access through logs, monitoring, and review</td>
            <td>
              Access and security logging retained for at least one year, with
              review during incident response and on suspicious activity.
            </td>
          </tr>
          <tr>
            <td>Continued processing if data is lost or access is destroyed</td>
            <td>Provider-backed backups with a documented restore path.</td>
          </tr>
          <tr>
            <td>Log and data retention of one year for detection and remedy</td>
            <td>
              Logs are retained for at least one year unless another law
              requires otherwise.
            </td>
          </tr>
          <tr>
            <td>Contractual safeguards with Data Processors</td>
            <td>
              Processors are bound to security obligations in their terms with
              us. See <a href="/subprocessors">Subprocessors</a>.
            </td>
          </tr>
          <tr>
            <td>Technical and organisational measures to ensure observance</td>
            <td>
              This page, the Privacy Policy, and internal operator runbooks for
              incidents and access.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>If something goes wrong</h2>
      <p>
        SophionOS is self-hosted: whoever operates an instance is responsible
        for securing it and for meeting any breach-notification duties that
        apply to them.
      </p>

      <h2>Your part</h2>
      <ul>
        <li>
          Use a unique password on the identity provider, and turn on
          multi-factor authentication there.
        </li>
        <li>
          Treat an API key as your full identity on the API surface it reaches.
          Give keys short expiries, use read-only where possible, and revoke keys
          you no longer use.
        </li>
        <li>
          Understand that once you connect an AI client, that client and its
          provider process what they receive under their own terms.
        </li>
      </ul>

      <h2>What we do not claim</h2>
      <ul>
        <li>
          That we cannot read your data: SophionOS Cloud holds the encryption
          key server-side, so our service role and the operator can read your
          content. We do not operate a zero-knowledge architecture.
        </li>
        <li>Military-grade security, or zero risk.</li>
        <li>
          That external AI providers never receive data after you connect a
          client; they do, because that is what connecting a client does.
        </li>
        <li>
          End-to-end encryption. We do not offer it, and we will not describe
          the service as end-to-end encrypted. Field-level encryption protects
          your content at rest in our database, but the server holds the key,
          so search, dashboards, and the email briefs you enable can read your
          content.
        </li>
        <li>
          A formal third-party security audit or a certification such as SOC 2
          or ISO 27001. We have none today, and we will not describe ourselves
          as audited until one exists.
        </li>
      </ul>

      <p>
        Report vulnerabilities through{" "}
        <a href="/responsible-disclosure">responsible disclosure</a>.
      </p>
      <p className="text-sm text-muted-foreground">
        This page is product documentation, not legal counsel.
      </p>
      <p>
        Related: <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·{" "}
        <a href="/subprocessors">Subprocessors</a>
      </p>
    </TrustPage>
  );
}
