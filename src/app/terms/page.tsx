import { TrustPageShell } from "@/components/trust/trust-page-shell";

export const metadata = {
  title: "Terms & Policies | SophionOS",
  description:
    "App terms for using SophionOS: accounts, plans and limits, API/MCP rules, your data, and service policies.",
};

export default function TermsPage() {
  return (
    <TrustPageShell title="Terms & Policies">
      <p className="text-sm text-muted-foreground">
        Last updated: September 9, 2026. These are the terms for the SophionOS
        application — the dashboard, settings, API, and MCP server you use after
        signing in.
      </p>
      <p>
        The landing site has its own terms at{" "}
        <a
          href="https://sophionos.com/terms"
          target="_blank"
          rel="noreferrer"
        >
          sophionos.com/terms
        </a>
        , which cover the marketing site and Founding Cohort seat purchases
        ($150 one-time via Dodo Payments, 14-day refund window). Those site
        terms do not govern day-to-day use of the app — this page does. By
        creating an account or using the app, you agree to these app terms.
      </p>

      <h2>1. The service</h2>
      <p>
        SophionOS is a life operating system and system of record for
        interconnected life domains: areas, goals, projects, tasks, notes,
        resources, topics, and contacts. The dashboard is the calm command
        surface; settings, export/deletion, API keys, and the MCP server let
        you control and connect that context.
      </p>
      <p>
        SophionOS is in public alpha. Expect rough edges, schema evolution, and
        incomplete operator tooling. The REST API (<code>/api/v1/*</code>) and
        the MCP server are <strong>experimental</strong> — do not treat them as
        a production multi-tenant API product yet. See{" "}
        <a href="/security">Security</a> and{" "}
        <a href="/data-and-ai">Data &amp; AI</a> for what is and is not claimed.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>
          <strong>Sign-in provider.</strong> Authentication, sessions, and
          account identity are handled by Clerk. You authorize SophionOS to use
          your Clerk user id (<code>sub</code>) as your application identity
          for authorization and row isolation.
        </li>
        <li>
          <strong>Eligibility.</strong> You must be old enough to form a binding
          contract in your jurisdiction (at least 16 where GDPR applies), and
          use the service only where it is lawful.
        </li>
        <li>
          <strong>One human, one account.</strong> Keep your credentials
          private. You are responsible for activity under your sessions and API
          keys until you revoke them or sign out.
        </li>
        <li>
          <strong>Operator access.</strong> Founders/operators with production
          credentials access production data only for incident response, a
          support escalation you initiate, or legal process — never routine
          browsing of private notes. Support will never ask for raw API keys,
          passwords, session tokens, or full private note dumps.
        </li>
      </ul>

      <h2>3. Plans, tiers, and technical limits</h2>
      <p>Launch tiers (enforced technically, not just by policy):</p>
      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th>Price intent</th>
            <th>What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>$0</td>
            <td>
              Core dashboard up to a 100-entity cap (areas, goals, projects,
              tasks, notes, resources, contacts, contact logs combined). No
              API/MCP access.
            </td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>$15/mo intent</td>
            <td>Unlimited entities, REST API + MCP access.</td>
          </tr>
          <tr>
            <td>Lifetime</td>
            <td>$150 one-time, first 100 subscribers</td>
            <td>
              Max-forever access, never expires while the service operates.
            </td>
          </tr>
          <tr>
            <td>Max</td>
            <td>Post-launch recurring</td>
            <td>Treated as equivalent to Lifetime for access checks.</td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li>
          A missing or inactive subscription resolves to <code>free</code>{" "}
          (fail-closed).
        </li>
        <li>
          API rate limits per minute: Free 100, Pro 500, Lifetime 500, Max
          1000. Exceeding them returns 429 — back off and retry.
        </li>
        <li>
          MCP/API routes that require a paid tier return 403 for Free keys.
          Billing-gated surfaces appear in Settings → Billing only when
          enabled for your deployment.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break the law, infringe rights, or store unlawful content.</li>
        <li>
          Probe, bypass, or defeat access controls — including RLS isolation,
          tier/entitlement checks, entity caps, rate limits, API-key hashing,
          or another user&apos;s data boundary.
        </li>
        <li>
          Abuse the service: spam, scraping other users, credential stuffing,
          denial-of-service, distributing malware, or reselling access without
          permission.
        </li>
        <li>
          Use the API/MCP to exfiltrate data you do not own, or to attempt
          prompt-injection / tool-abuse against other users&apos; clients.
        </li>
        <li>
          Misrepresent the service as zero-knowledge, end-to-end encrypted, or
          formally audited — it is none of those today.
        </li>
      </ul>
      <p>
        We may rate-limit, suspend, or terminate accounts that violate these
        rules or threaten the security or availability of the service.
      </p>

      <h2>5. API keys, MCP, and AI clients</h2>
      <ul>
        <li>
          Creating a key is always your explicit action (Settings → AI Access /
          API keys). Keys are stored as cryptographic hashes, shown once, and
          are revocable with optional expiry. Default MCP posture is read-only.
        </li>
        <li>
          <strong>Treat keys as broad access.</strong> Fine-grained per-entity
          scopes are incomplete — a live key acts as you on the API surface it
          reaches until revoked. Permanent deletes stay dashboard-only;
          write-enabled keys can still archive and mutate. Use short expiries
          and revoke after demos.
        </li>
        <li>
          SophionOS core does not send your notes to a model provider by
          default. When <em>you</em> connect Claude, Codex, Cursor, OpenCode,
          Antigravity, or any MCP-compatible client, that client calls
          SophionOS with your key — and the client/model provider processes
          whatever <em>it</em> sends under <em>its</em> terms, outside
          SophionOS control. You are responsible for what you authorize a
          client to read or change.
        </li>
        <li>
          Revoking a key or using “Disable all AI access” rejects subsequent
          API-key requests immediately. Dashboard (Clerk session) access is
          separate and continues until you sign out or delete the account.
        </li>
      </ul>
      <p>
        Full flow and access modes are documented in{" "}
        <a href="/data-and-ai">Data &amp; AI</a>.
      </p>

      <h2>6. Your data: ownership, export, deletion</h2>
      <ul>
        <li>
          <strong>Your content stays yours.</strong> We do not train AI models
          on your private SophionOS content. See{" "}
          <a href="/privacy">Privacy</a> for what is stored and your controls.
        </li>
        <li>
          <strong>Export.</strong> Authenticated export of core personal data
          (JSON) is available via Settings → Privacy &amp; data or{" "}
          <code>GET /api/v1/user/export</code>. Raw key secrets are never
          exported.
        </li>
        <li>
          <strong>Deletion.</strong> Requesting account deletion from Privacy
          &amp; data immediately disables AI access and revokes keys, then
          schedules a purge after a 14-day grace period (cancellable). Billing
          and legal records may be retained where required, and backups/logs
          clear on the operator&apos;s window — we do not promise instant
          erasure from every backup worldwide.
        </li>
        <li>
          <strong>Processors.</strong> Depending on deployment: Clerk (identity),
          Supabase/Postgres (database), Vercel or your host (delivery), a
          billing provider when enabled, and any AI client you connect. See{" "}
          <a href="/subprocessors">Subprocessors</a>.
        </li>
      </ul>

      <h2>7. Sophion Cloud vs self-host</h2>
      <p>
        These terms govern use of the Sophion Cloud-hosted app. The underlying
        code is open source under AGPL-3.0-or-later: if you self-host,{" "}
        <em>you</em> are the operator — you choose processors, regions,
        backups, TLS, retention, and legal basis, and this page&apos;s Cloud
        specifics (billing, hosted subprocessors) do not apply to your
        deployment. Do not claim “data never leaves the device” unless your
        deployment truly uses no network identity, hosted DB, or remote AI
        clients.
      </p>

      <h2>8. Intellectual property</h2>
      <ul>
        <li>
          <strong>Code.</strong> SophionOS Core is licensed under{" "}
          <code>AGPL-3.0-or-later</code> (see <code>LICENSE</code>). That
          license governs the software; these terms govern the hosted service.
        </li>
        <li>
          <strong>Your content.</strong> You retain all rights to the areas,
          goals, notes, contacts, and other content you create. You grant
          SophionOS only the limited right to store, process, and serve it back
          to you and the clients you authorize.
        </li>
        <li>
          <strong>Our marks.</strong> SophionOS names, logos, and trade dress
          are not licensed under the AGPL — don&apos;t use them to imply
          endorsement. See <code>TRADEMARKS.md</code> in the repository.
        </li>
      </ul>

      <h2>9. Billing</h2>
      <ul>
        <li>
          Paid features are billed through the configured billing provider when
          enabled — SophionOS does not store card details on its own servers.
          Founding-seat purchases remain under the site terms
          (sophionos.com/terms).
        </li>
        <li>
          Cancel in Settings → Billing (when shown) or via support; access
          continues to the end of the paid period unless stated otherwise.
          Invoices and legally required records may be retained after
          cancellation.
        </li>
      </ul>

      <h2>10. Suspension and termination</h2>
      <p>
        You may stop using the service and delete your account at any time via
        Settings → Privacy &amp; data. We may suspend or terminate access for
        violations of §4, non-payment, abuse, legal obligation, or to protect
        the service — with reasonable notice where feasible. On termination,
        your right to use the hosted service ends; export first if you need
        your data.
      </p>

      <h2>11. Disclaimers</h2>
      <p>
        The service is provided “as is” without warranties of any kind, to the
        extent permitted by law — including merchantability, fitness for a
        particular purpose, uninterrupted availability, or error-free operation.
        There has been no formal third-party security audit of this tree; the
        API/MCP surface is experimental and residual risks (prompt injection,
        client-side exfiltration you authorize, operator-visible service data)
        remain. Do not rely on SophionOS as your sole store for critical,
        medical, legal, or safety-critical information.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, SophionOS and its contributors
        are not liable for indirect, incidental, special, consequential, or
        punitive damages — including loss of data, loss of profits, or
        reliance on AI-client output — even if advised of the possibility. Our
        aggregate liability for paid-service claims is limited to the amounts
        you paid for the service in the 12 months before the claim arose (or
        $0 for free use).
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update this page as the product matures (tiers, caps, API scope,
        processors). Material changes will be noted by updating the date above;
        continued use after the update is acceptance. If a signed Cloud order
        or enterprise agreement conflicts with this page, the signed agreement
        controls.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these app terms, or requests about your account and
        data: use the support channel shown in the app, or email{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
        Security issues follow{" "}
        <a href="/responsible-disclosure">responsible disclosure</a>.
      </p>
      <p>
        Related: <a href="/privacy">Privacy</a> ·{" "}
        <a href="/security">Security</a> · <a href="/data-and-ai">Data &amp; AI</a>{" "}
        · <a href="/subprocessors">Subprocessors</a> ·{" "}
        <a href="/responsible-disclosure">Disclosure</a>
      </p>
    </TrustPageShell>
  );
}
