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
        version="2.0"
        effective="October 18, 2026"
        summary="Replaces the previous security page. Adds the minimum safeguards required by Rule 6 of the DPDP Rules, 2025, the incident-response and breach-notification commitments from §8 of the Privacy Policy, and a clear separation between what SophionOS Cloud provides and what a self-hosted deployment does not."
      />

      <h2>What we do</h2>
      <ul>
        <li>
          <strong>Account security</strong> — authentication and sessions are
          handled by Clerk, including session revocation on sign-out. We never
          store your password.
        </li>
        <li>
          <strong>Per-user isolation</strong> — Postgres row-level security
          enforces that a session sees only its own user&apos;s rows. The
          API-key path filters every query by the authenticated user id. Plan
          and entitlement checks are server-side and fail closed: a missing or
          inactive subscription resolves to <code>free</code>.
        </li>
        <li>
          <strong>Encryption in transit</strong> — all traffic is served over
          TLS, and a per-request nonce-based Content Security Policy restricts
          what scripts the app will execute.
        </li>
        <li>
          <strong>Encryption at rest</strong> — provided by our database and
          hosting providers on their storage layer. We do not currently
          implement application-level or field-level encryption of workspace
          content inside this codebase. The SophionOS Cloud service advertises
          field-level encryption of personal content; that is a property of the
          managed service, not of this source tree, and you should confirm it
          with us before relying on it for a specific record.
        </li>
        <li>
          <strong>API keys</strong> — stored only as cryptographic hashes, shown
          once at creation, revocable, with optional expiry, per-key labels and
          scopes, and a read-only default posture for MCP.
        </li>
        <li>
          <strong>AI controls</strong> — a global AI disable switch, per-key
          write modes, per-connection toggles, and activity metadata you can
          review. Revoking a key rejects subsequent requests immediately.
        </li>
        <li>
          <strong>Logging and visibility</strong> — security and access logs,
          retained for at least one year, so that unauthorised access can be
          detected, investigated, and remediated.
        </li>
        <li>
          <strong>Backups &amp; recovery</strong> — Cloud takes provider-backed
          backups. They are not zero-knowledge: the operator and the database
          provider can read what is in them.
        </li>
        <li>
          <strong>Operator access</strong> — production credentials are held by
          the founder/operator and used for incident response, a support
          escalation you initiate, or legal process. Support will never ask for
          raw API keys, passwords, session tokens, or a full dump of your notes.
        </li>
      </ul>

      <h2>India — minimum safeguards under Rule 6, DPDP Rules 2025</h2>
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
              TLS in transit, provider-side encryption at rest, hashed API keys,
              and per-user row isolation. See the field-level encryption note
              above.
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
        When we become aware of a personal data breach we contain it first, then
        notify. The notification timelines — including the 72-hour intimation to
        the Data Protection Board of India under Rule 7, the GDPR Article 33
        timeline, and the applicable U.S. state deadlines — are set out in{" "}
        <a href="/privacy">the Privacy Policy, §8</a>. Notices tell you what
        happened, what data was involved, what we have done, what you should do,
        and how to reach a person who can answer questions.
      </p>

      <h2>Your part</h2>
      <ul>
        <li>Use a unique password on the identity provider, with MFA enabled.</li>
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
          That we cannot read your data — a service role and the database
          provider can read what is stored, and we do not operate a
          zero-knowledge architecture.
        </li>
        <li>Military-grade security, or zero risk.</li>
        <li>
          That external AI providers never receive data after you connect a
          client — they do, because that is what connecting a client does.
        </li>
        <li>
          End-to-end encryption. We do not offer it, and the Service must be
          able to read your content to search it, render it, and send the briefs
          you enable.
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
      <p>
        Related: <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·{" "}
        <a href="/subprocessors">Subprocessors</a>
      </p>
    </TrustPage>
  );
}
