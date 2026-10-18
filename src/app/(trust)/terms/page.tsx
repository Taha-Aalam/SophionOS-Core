import { PolicyMeta } from "@/components/trust/policy-meta";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Terms & Policies | SophionOS",
  description:
    "App terms for using SophionOS: accounts, plans and limits, API/MCP rules, your data, and service policies.",
};

export default function TermsPage() {
  return (
    <TrustPage
      emoji="📜"
      title="Terms & Policies"
      description="App terms for using SophionOS: accounts, plans and limits, API/MCP rules, your data, and service policies."
    >
      <PolicyMeta
        version="2.0"
        effective="October 18, 2026"
        summary="Replaces the September 9, 2026 terms. Plans rebuilt around Free / Pro / Power / Business; the retired Lifetime tier is removed; founding-seat terms, arbitration, refund, and jurisdiction clauses added. Anyone who held a plan that is no longer offered is covered by §15."
      />

      <p>
        The SophionOS application at{" "}
        <a href="https://app.sophionos.com">app.sophionos.com</a> (the
        &quot;<strong>Service</strong>&quot;) is operated by SophionOS
        (&quot;<strong>SophionOS</strong>&quot;, &quot;<strong>we</strong>
        &quot;, &quot;<strong>us</strong>&quot;, &quot;<strong>our</strong>
        &quot;). These Terms govern your use of the Service. By creating an
        account, using the Service, or clicking &quot;I agree&quot;, you accept
        them on behalf of yourself or the entity you represent. If you do not
        agree, do not use the Service.
      </p>
      <p>
        The marketing site at{" "}
        <a href="https://www.sophionos.com">www.sophionos.com</a> has separate
        terms at{" "}
        <a href="https://www.sophionos.com/terms">sophionos.com/terms</a>,
        which govern the landing site and Founding Cohort seat purchases.
        Those site terms and these app terms are written to agree with each
        other; where they differ, and the difference concerns a founding-seat
        purchase, the site terms control. Where the difference concerns your
        day-to-day use of the app, these terms control.
      </p>

      <p>
        <strong>Please read §13 (dispute resolution) carefully.</strong> It
        contains an agreement to resolve disputes through binding individual
        arbitration rather than in court, and it waives class-action and
        jury-trial rights. You may opt out within 30 days as described there.
      </p>

      <h2>1. The Service</h2>
      <p>
        SophionOS is a connected context layer for people who work with AI: a
        structured system of record holding areas, goals, projects, tasks,
        notes, resources, topics, and contacts, together with the relationships
        between them. The dashboard is the command surface; settings, export,
        deletion, API keys, and the MCP server let you control and connect that
        context.
      </p>
      <p>
        <strong>Development status.</strong> The Service is under active
        development. Expect rough edges, schema change, and incomplete operator
        tooling. The REST API (<code>/api/v1/*</code>) and the MCP server are{" "}
        <strong>experimental</strong>: interfaces may change, and they are not
        sold as a stable multi-tenant integration contract. See{" "}
        <a href="/security">Security</a> and <a href="/data-and-ai">Data &amp; AI</a>{" "}
        for what is and is not claimed.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>
          <strong>Identity provider.</strong> Authentication, sessions, and
          account identity are handled by Clerk. You authorize SophionOS to use
          your Clerk user id (<code>sub</code>) as your application identity for
          authorization and row isolation.
        </li>
        <li>
          <strong>Eligibility.</strong> You must be at least 18 years old and
          able to form a binding contract. The Service is not directed to
          children, and we do not knowingly open accounts for anyone under 18.
          Where local law requires a higher age or guardian consent, that law
          applies.
        </li>
        <li>
          <strong>One person, one account.</strong> Keep your credentials
          private. You are responsible for activity under your sessions and API
          keys until you revoke them or sign out.
        </li>
        <li>
          <strong>Accurate information.</strong> Give accurate account details
          and keep them current. You may delete your account at any time from
          Settings → Privacy &amp; data, or by writing to{" "}
          <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
        </li>
        <li>
          <strong>Operator access.</strong> Operators holding production
          credentials access production data only for incident response, a
          support escalation you initiate, or legal process — never routine
          browsing of private notes. Support will never ask for raw API keys,
          passwords, session tokens, or full private note dumps.
        </li>
      </ul>

      <h2>3. Plans, tiers, and technical limits</h2>
      <p>
        SophionOS Cloud is offered in the plans below. Prices are in US dollars
        and may change; a change never applies retroactively to a period you
        have already paid for.
      </p>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>$0 forever</td>
            <td>
              The managed personal workspace with entity and usage limits, and
              usage through the web app. Paid integrations — REST API and MCP
              access — require a paid plan. A missing or inactive subscription
              resolves to <code>free</code> (fail-closed).
            </td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>$15/month</td>
            <td>
              The full managed workspace: backups and recovery, automatic
              updates, multiple AI connections and MCP clients, daily assistants
              and scheduled automations, knowledge search, and generous REST API
              and MCP capacity with per-key expiry, labels, scopes, and activity
              history.
            </td>
          </tr>
          <tr>
            <td>Power</td>
            <td>$30/month</td>
            <td>
              Everything in Pro, plus advanced AI policies, approval workflows
              for sensitive actions, webhooks and event-driven automation,
              premium connectors, longer activity retention, and higher API and
              MCP headroom for multiple agents.
            </td>
          </tr>
          <tr>
            <td>Business</td>
            <td>Contact sales</td>
            <td>
              Governed company context and Company Brain: organization
              workspaces and roles, AI access policies and audit logs,
              permission-aware search, SSO and SCIM, SLA and implementation
              support, and data residency options. Governed by a signed order or
              agreement where one exists.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Power is being built.</strong> Where a Power feature has not
        shipped, we say so in the app and in the monthly build notes. You are
        buying the plan, not a delivery date for an individual feature.
      </p>
      <ul>
        <li>
          API rate limits are per minute and are enforced per plan; the current
          limits are shown in the app under Settings → AI Access. Exceeding a
          limit returns HTTP 429 — back off and retry.
        </li>
        <li>
          MCP and API routes that require a paid plan return 403 for Free keys.
          Billing surfaces appear in Settings → Billing only when billing is
          enabled for your deployment.
        </li>
        <li>
          Self-hosted SophionOS Core has no SophionOS plans, caps, or billing.
          You run it and you set its limits (§9).
        </li>
      </ul>

      <h2>4. Founding Cohort seats</h2>
      <p>
        The Founding Cohort is limited to 100 seats. A seat is a one-time
        payment of <strong>$150</strong> and includes{" "}
        <strong>1 year of Pro</strong>, starting when payment is confirmed, and{" "}
        <strong>2 years of Power</strong>, also starting when payment is
        confirmed, with Power features arriving as they ship. A seat is
        reserved when payment is confirmed; an unfinished checkout stays on the
        pending list and can be resumed from the link we email you.
      </p>
      <ul>
        <li>
          <strong>No recurring charge.</strong> A seat is not a subscription.
          When the included periods end, the account resolves to the plan that
          is then available; we will tell you before that happens.
        </li>
        <li>
          <strong>Refunds.</strong> Full refund within 14 days of payment, by
          replying to any email from the founder or writing to{" "}
          <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
          After 14 days the payment is final. Your statutory rights where you
          live are unaffected.
        </li>
        <li>
          <strong>Payment processing.</strong> Seat payments are processed by
          Dodo Payments on its hosted checkout. We do not store your card
          details.
        </li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break the law, infringe rights, or store unlawful content.</li>
        <li>
          Probe, bypass, or defeat access controls — including row-level
          security isolation, plan/entitlement checks, entity caps, rate limits,
          API-key hashing, or another user&apos;s data boundary.
        </li>
        <li>
          Abuse the Service: spam, scraping other users, credential stuffing,
          denial-of-service, distributing malware, or reselling access without
          permission.
        </li>
        <li>
          Use the API or MCP to exfiltrate data you do not own, or to attempt
          prompt injection or tool abuse against other users&apos; clients.
        </li>
        <li>
          Reverse engineer, decompile, or attempt to extract source code from
          the Service, except where the source is already licensed to you under
          §10 or where the law expressly permits it.
        </li>
        <li>
          Build a competing product by scraping or copying the Service or its
          content.
        </li>
        <li>
          Misrepresent the Service as zero-knowledge, end-to-end encrypted, or
          formally audited — it is none of those today.
        </li>
      </ul>
      <p>
        We may rate-limit, suspend, or terminate accounts that violate these
        rules or threaten the security or availability of the Service.
      </p>

      <h2>6. API keys, MCP, and AI clients</h2>
      <ul>
        <li>
          Creating a key is always your explicit action (Settings → AI Access).
          Keys are stored as cryptographic hashes, shown once, and are revocable
          with optional expiry. The default MCP posture is read-only.
        </li>
        <li>
          <strong>Treat keys as broad access.</strong> Fine-grained per-entity
          scopes are incomplete — a live key acts as you on the API surface it
          reaches until revoked. Permanent deletes stay dashboard-only;
          write-enabled keys can still archive and mutate. Use short expiries
          and revoke after demos.
        </li>
        <li>
          SophionOS does not send your notes to a model provider by default.
          When <em>you</em> connect Claude, Codex, Cursor, OpenCode,
          Antigravity, or any MCP-compatible client, that client calls
          SophionOS with your key — and the client and its model provider
          process whatever <em>it</em> sends under <em>its</em> terms, outside
          SophionOS control. You are responsible for what you authorize a client
          to read or change, and for the output any AI produces from it.
        </li>
        <li>
          Revoking a key or using &ldquo;Disable all AI access&rdquo; rejects
          subsequent API-key requests immediately. Dashboard (Clerk session)
          access is separate and continues until you sign out or delete the
          account.
        </li>
      </ul>
      <p>
        Full flow and access modes are documented in{" "}
        <a href="/data-and-ai">Data &amp; AI</a>.
      </p>

      <h2>7. Your data: ownership, export, deletion</h2>
      <ul>
        <li>
          <strong>Your content stays yours.</strong> We do not train AI models
          on your private SophionOS content. See <a href="/privacy">Privacy</a>{" "}
          for what is stored and your controls.
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
          schedules a purge after a 14-day grace period, cancellable during that
          period. Billing and legal records may be retained where required, and
          backups and logs clear on the operator&apos;s window — we do not
          promise instant erasure from every backup worldwide.
        </li>
        <li>
          <strong>Processors.</strong> Depending on deployment: Clerk
          (identity), Supabase/Postgres (database), Vercel or your host
          (delivery), Dodo Payments (founding seats), Resend (transactional
          email), and any AI client you connect. See{" "}
          <a href="/subprocessors">Subprocessors</a>.
        </li>
      </ul>

      <h2>8. Privacy</h2>
      <p>
        Your use of the Service is also governed by our{" "}
        <a href="/privacy">Privacy Policy</a>, which is incorporated into these
        terms by reference. It describes what we collect, why, how we share it,
        how long we keep it, and the rights you have — including under the EU and
        UK GDPR, U.S. state privacy laws, and India&apos;s Digital Personal Data
        Protection Act, 2023. If there is a conflict between these terms and the
        Privacy Policy about the processing of your personal data, the Privacy
        Policy controls.
      </p>

      <h2>9. Self-hosted SophionOS Core vs SophionOS Cloud</h2>
      <p>
        These terms govern your use of SophionOS Cloud. The underlying code,
        SophionOS Core, is open source under <code>AGPL-3.0-or-later</code>. If
        you self-host, <em>you</em> are the operator of that deployment: you
        choose processors, regions, backups, TLS, retention, and legal basis, and
        the Cloud specifics on this page (plans, billing, hosted subprocessors)
        do not apply. Do not describe a self-hosted deployment as &ldquo;data
        never leaves the device&rdquo; unless it truly uses no network identity,
        hosted database, or remote AI clients.
      </p>

      <h2>10. Intellectual property</h2>
      <ul>
        <li>
          <strong>Code.</strong> SophionOS Core is licensed under{" "}
          <code>AGPL-3.0-or-later</code> (see <code>LICENSE</code> in the
          repository). That license governs the software; these terms govern the
          hosted Service.
        </li>
        <li>
          <strong>Your content.</strong> You retain all rights to the areas,
          goals, notes, contacts, and other content you create. You grant
          SophionOS only the limited license needed to store, process, back up,
          and serve that content back to you and to the clients you authorize.
        </li>
        <li>
          <strong>Our marks.</strong> SophionOS names, logos, and trade dress
          are not licensed under the AGPL — do not use them to imply
          endorsement. See <code>TRADEMARKS.md</code> in the repository.
        </li>
        <li>
          <strong>Feedback.</strong> If you send us suggestions about the
          Service, you grant us a perpetual, worldwide, royalty-free license to
          use them without attribution or obligation. Do not send us feedback
          you consider confidential.
        </li>
      </ul>

      <h2>11. Third-party services</h2>
      <p>
        The Service links to and integrates with third parties — AI clients,
        payment processing, identity, hosting. We do not control them and are not
        responsible for their acts, omissions, or terms. Your use of a
        third-party service is between you and that provider.
      </p>

      <h2>12. Fees, billing, and refunds</h2>
      <ul>
        <li>
          Paid plans are billed through the configured billing provider on a
          recurring basis until cancelled. SophionOS does not store card details
          on its own servers.
        </li>
        <li>
          Cancel any time from Settings → Billing, or by writing to us. Access
          continues to the end of the paid period unless stated otherwise.
          Invoices and legally required records are retained after cancellation.
        </li>
        <li>
          <strong>Consumers in the EU, UK, and similar jurisdictions:</strong>{" "}
          where a 14-day right of withdrawal applies to a digital subscription,
          you may withdraw within 14 days of purchase. Founding-seat purchases
          follow §4.
        </li>
        <li>
          We may change plan prices. We will give notice before a change takes
          effect for an existing paid subscription, and you may cancel before it
          does.
        </li>
      </ul>

      <h2>13. Dispute resolution, arbitration, and class-action waiver</h2>
      <p>
        <strong>
          Please read this section carefully. It affects your legal rights,
          including your right to sue in court and your right to a jury trial.
        </strong>
      </p>
      <ol>
        <li>
          <strong>Try to resolve it first.</strong> Before starting arbitration,
          write to{" "}
          <a href="mailto:founders@sophionos.com">founders@sophionos.com</a> with
          a description of the dispute and the relief you want. We will do the
          same if we have a dispute with you. If we have not resolved it within
          60 days, either of us may start arbitration.
        </li>
        <li>
          <strong>Agreement to arbitrate.</strong> Except as stated below, you
          and SophionOS agree to resolve every dispute arising out of or relating
          to the Service or these terms through binding individual arbitration,
          and not in court. The arbitration is administered under the rules of a
          recognized arbitration provider we agree with you in writing; if we
          cannot agree, under the American Arbitration Association&apos;s
          Consumer Arbitration Rules for consumer disputes. The seat of
          arbitration is the county where you live, unless we both agree
          otherwise.
        </li>
        <li>
          <strong>Exceptions.</strong> Either of us may bring an individual
          claim in small-claims court if it qualifies, and either of us may seek
          injunctive or other equitable relief in court to protect intellectual
          property rights. Nothing here stops you from bringing a matter to a
          data-protection regulator (§8 and the Privacy Policy).
        </li>
        <li>
          <strong>Waiver of class actions.</strong> All disputes must be
          brought on an individual basis. Neither you nor SophionOS may bring a
          claim as a plaintiff or class member in any class, representative, or
          collective proceeding. The arbitrator may award relief only on an
          individual basis.
        </li>
        <li>
          <strong>Waiver of jury trial.</strong> By agreeing to arbitration,
          you and SophionOS waive the right to a trial by judge or jury for all
          covered claims.
        </li>
        <li>
          <strong>Opt out.</strong> You may opt out of this arbitration
          agreement within 30 days of first accepting these terms by emailing{" "}
          <a href="mailto:founders@sophionos.com">founders@sophionos.com</a> with
          your name and account email and a clear statement that you wish to opt
          out. Opting out does not affect any other part of these terms.
        </li>
        <li>
          <strong>If this section does not apply to you.</strong> Some
          jurisdictions do not allow mandatory arbitration or class-action
          waivers against consumers. If that law applies to you, this section
          does not apply to the extent it is prohibited, and the rest of these
          terms stand. Nothing in this section limits a mandatory statutory right
          you have where you live.
        </li>
      </ol>

      <h2>14. Disclaimers, limitation of liability, indemnity</h2>
      <p>
        <strong>Disclaimers.</strong> To the maximum extent permitted by law, the
        Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
        without warranties of any kind, express or implied, including
        merchantability, fitness for a particular purpose, title, and
        non-infringement. We do not warrant that the Service will be
        uninterrupted, error-free, or secure. There has been no formal
        third-party security audit of this codebase; the API and MCP surfaces
        are experimental, and residual risks — prompt injection, exfiltration you
        authorize through a client, operator-visible service data — remain. Do
        not rely on SophionOS as the sole store for critical, medical, legal, or
        safety-critical information. Where the law requires a warranty, it is
        limited to 90 days from first use. Nothing here excludes liability for
        death, personal injury, fraud, or anything else the law does not allow to
        be excluded.
      </p>
      <p>
        <strong>Limitation of liability.</strong> To the maximum extent permitted
        by law, neither party is liable for lost profits, lost data, cost of
        substitute services, or indirect, consequential, incidental, special,
        exemplary, or punitive damages arising from these terms or your use of
        (or inability to use) the Service, even if advised of the possibility.
        Our total aggregate liability under these terms is capped at the greater
        of (a) $50 USD and (b) the amount you paid SophionOS for the Service in
        the 12 months before the event giving rise to the claim. Multiple claims
        do not increase the cap.
      </p>
      <p>
        <strong>Indemnity.</strong> You agree to defend and indemnify SophionOS
        and its contributors against claims, and reasonable costs and
        attorneys&apos; fees, arising from your violation of these terms, your
        violation of any law, or content you submit that infringes a third
        party&apos;s rights. We may take over the defense of any such claim at
        your expense, and you agree not to settle one without our written
        consent.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms as the product matures — plans, limits, API
        scope, processors. Material changes will be noted by updating the version
        and effective date at the top of this page and, where we have your email,
        announced by email before they take effect. Continued use after the
        effective date is acceptance for future use; the version in force when
        you accepted the terms governs the period before that.
      </p>
      <p>
        <strong>Retired plans.</strong> The Lifetime tier described in earlier
        versions of this page is retired. It is not offered, it was not sold to
        the public, and no current price or plan corresponds to it. Anyone
        holding a plan that is no longer offered keeps the access they were
        granted when they bought it, for as long as the Service operates; if you
        believe you hold one, write to{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a> and we
        will confirm your status.
      </p>
      <p>
        If a signed Cloud order or enterprise agreement conflicts with this page,
        the signed agreement controls.
      </p>

      <h2>16. General</h2>
      <ul>
        <li>
          <strong>Governing law.</strong> These terms are governed by the laws
          of the jurisdiction where SophionOS is established, without regard to
          conflict-of-law rules, and subject always to any mandatory consumer
          protection in your country of residence. Where arbitration does not
          apply, we each consent to the exclusive jurisdiction of the courts of
          that jurisdiction, and either of us may use any court with jurisdiction
          for equitable relief.
        </li>
        <li>
          <strong>Export.</strong> You agree not to export or re-export anything
          from the Service in violation of applicable export-control law,
          including U.S. export controls and applicable Indian export law.
        </li>
        <li>
          <strong>Assignment.</strong> You cannot assign these terms without our
          written consent. We may assign them in connection with a merger,
          acquisition, or sale of assets, and will notify you if we do.
        </li>
        <li>
          <strong>Entire agreement; severability.</strong> These terms, together
          with the Privacy Policy and any signed order, are the entire agreement
          between us about the Service. If a provision is unenforceable, it will
          be limited to the minimum extent necessary and the rest stays in
          effect. Our failure to enforce a provision is not a waiver.
        </li>
        <li>
          <strong>Copyright.</strong> © 2026 SophionOS. All rights reserved. See{" "}
          <code>LICENSE</code> for the code license.
        </li>
      </ul>

      <h2>17. Contact</h2>
      <p>
        Questions about these terms, or requests about your account and data:{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
        Security issues follow{" "}
        <a href="/responsible-disclosure">responsible disclosure</a>. Privacy
        requests, including GDPR and DPDP rights, are described in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
      <p>
        Related: <a href="/privacy">Privacy</a> ·{" "}
        <a href="/security">Security</a> · <a href="/data-and-ai">Data &amp; AI</a>{" "}
        · <a href="/subprocessors">Subprocessors</a> ·{" "}
        <a href="/responsible-disclosure">Disclosure</a>
      </p>
    </TrustPage>
  );
}
