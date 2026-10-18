import { PolicyMeta } from "@/components/trust/policy-meta";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Privacy | SophionOS",
  description: "How SophionOS handles your personal context data.",
};

export default function PrivacyPage() {
  return (
    <TrustPage
      emoji="🔒"
      title="Privacy"
      description="How SophionOS handles your personal context data."
    >
      <PolicyMeta
        version="2.0"
        effective="October 18, 2026"
        summary="Replaces the previous privacy page. Adds the GDPR notice for European users, the U.S. state privacy notice (CCPA/CPRA and others), and an India section under the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025 — including the 72-hour breach-reporting obligation."
      />

      <p>
        Your SophionOS data is yours. We do not train AI models on your private
        SophionOS content, and we do not send your data to an AI model unless you
        connect a client yourself. This policy describes what we collect, why,
        how we share it, how long we keep it, and the rights you have.
      </p>
      <p>
        SophionOS (&quot;<strong>SophionOS</strong>&quot;, &quot;<strong>we</strong>
        &quot;) provides the SophionOS application at app.sophionos.com and the
        marketing site at www.sophionos.com (together, the
        &quot;<strong>Service</strong>&quot;). This policy applies to both.
      </p>

      <h2>1. Personal information we collect</h2>
      <p>
        <strong>Information you provide.</strong>
      </p>
      <ul>
        <li>
          <strong>Account data</strong> — your email address, display name, and
          profile image, provided through Clerk when you sign up or sign in. We
          never see or store your password.
        </li>
        <li>
          <strong>Workspace content</strong> — the areas, goals, projects,
          tasks, notes, resources, topics, contacts, and relationships you
          create. This is the core of what the Service holds and it is yours.
        </li>
        <li>
          <strong>Settings and preferences</strong> — theme, AI access toggles,
          notification choices, and onboarding state.
        </li>
        <li>
          <strong>Communications</strong> — messages you send us, including
          support requests and founding-seat correspondence.
        </li>
      </ul>
      <p>
        <strong>Information from third-party sources.</strong>
      </p>
      <ul>
        <li>
          <strong>Identity provider</strong> — Clerk supplies your verified
          email, name, and avatar, and your user identifier.
        </li>
        <li>
          <strong>Payment provider</strong> — for founding seats, Dodo Payments
          tells us whether a payment succeeded. We do not receive your card
          number.
        </li>
        <li>
          <strong>Cohort membership</strong> — the marketing site tells the app
          whether the account email holds a founding seat.
        </li>
      </ul>
      <p>
        <strong>Information collected automatically.</strong> Like most web
        applications we log the technical facts needed to serve and secure a
        request: IP address, user agent, timestamp, request path, response
        status, and an error identifier. We use these for security,
        rate-limiting, debugging, and abuse prevention. We do not build
        behavioral advertising profiles, and we do not use third-party
        advertising trackers.
      </p>
      <p>
        <strong>Sensitive data.</strong> Do not put sensitive personal data into
        the Service — for example government identification numbers, health
        records, biometrics, or financial account details. The Service is not
        designed for it, and you should not send it to us.
      </p>

      <h2>2. How we use your personal information</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>What it involves</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Providing the Service</td>
            <td>
              Storing your workspace, serving the dashboard, running the API and
              MCP server, delivering export and account deletion.
            </td>
          </tr>
          <tr>
            <td>Authentication and security</td>
            <td>
              Verifying sessions through Clerk, isolating rows per user,
              hashing API keys, enforcing rate limits, detecting abuse, and
              investigating incidents.
            </td>
          </tr>
          <tr>
            <td>Transactional email</td>
            <td>
              Sending briefs you enable and service notices such as billing
              confirmations and policy changes.
            </td>
          </tr>
          <tr>
            <td>Billing</td>
            <td>
              Processing founding-seat payments and keeping the tax and
              accounting records we are required to keep.
            </td>
          </tr>
          <tr>
            <td>Support</td>
            <td>Answering your requests and fixing the problems they report.</td>
          </tr>
          <tr>
            <td>Product improvement</td>
            <td>
              Understanding aggregate usage so we can make the product work
              better. We use aggregated or de-identified data where possible and
              do not attempt to re-identify it.
            </td>
          </tr>
          <tr>
            <td>Legal compliance</td>
            <td>
              Complying with law, responding to valid legal process, and
              establishing or defending legal claims.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>We do not sell your personal information</strong>, and we do not
        share it for cross-context behavioral advertising. We do not train AI
        models on your workspace content.
      </p>

      <h2>3. How we share personal information</h2>
      <ul>
        <li>
          <strong>Service providers</strong> that run the Service under
          contract: Clerk (identity), Supabase (database and hosting),
          Vercel (application hosting), Dodo Payments (founding-seat payments),
          and Resend (transactional email). The current list, with purposes, is
          at <a href="/subprocessors">Subprocessors</a>.
        </li>
        <li>
          <strong>AI clients you connect.</strong> If you create an API key and
          connect Claude, Cursor, Codex, or another MCP client, that client calls
          SophionOS and its provider processes what it receives. This happens
          only because you set it up, and it is outside our control after the
          request leaves us. See <a href="/data-and-ai">Data &amp; AI</a>.
        </li>
        <li>
          <strong>Legal and safety.</strong> Where we are required by law, or
          where we reasonably believe disclosure is necessary to prevent harm or
          to protect rights and safety, we may disclose information.
        </li>
        <li>
          <strong>Corporate events.</strong> If SophionOS is merged, acquired, or
          sells assets, your information may transfer as part of that
          transaction. We will notify you before your information becomes
          subject to a different privacy policy.
        </li>
        <li>
          <strong>Aggregated data.</strong> We may share de-identified,
          aggregated data that cannot reasonably be linked back to you.
        </li>
      </ul>

      <h2>4. Cookies and tracking</h2>
      <p>
        The Service uses only the cookies needed to keep you signed in and to
        remember your theme preference. These are strictly necessary or
        functional; there is no advertising or cross-site tracking cookie, and
        there is no consent banner because there is nothing to consent to. If
        that ever changes, this section and a consent mechanism will change with
        it before any such cookie is set.
      </p>

      <h2>5. Retention</h2>
      <p>
        Your workspace content is kept until you delete it or complete account
        deletion. Account deletion disables AI access and revokes keys
        immediately, and purges application data after a 14-day grace period
        that you can cancel during that window. After purge, residual copies may
        exist in provider backups for the provider&apos;s documented window; we
        do not claim instant erasure from every backup worldwide.
      </p>
      <p>
        We keep billing, tax, and accounting records for as long as the law
        requires. We keep security and access logs for at least one year — India
        requires at least one year for data fiduciaries processing under the
        DPDP Rules, 2025, and the same window covers our incident investigation
        needs everywhere.
      </p>

      <h2>6. Your choices and controls</h2>
      <ul>
        <li>
          <strong>Review and revoke AI access</strong> in Settings → AI Access.
          Revoking a key cuts off API and MCP requests immediately.
        </li>
        <li>
          <strong>Export your data</strong> (JSON) from Settings → Privacy &amp;
          data, or <code>GET /api/v1/user/export</code>.
        </li>
        <li>
          <strong>Delete your account</strong> from Settings → Privacy &amp;
          data.
        </li>
        <li>
          <strong>Opt out of non-essential email</strong> using the unsubscribe
          link in any message, or by writing to us. Service and security notices
          are not marketing and are sent regardless.
        </li>
        <li>
          <strong>Correct your profile</strong> in Settings → Profile.
        </li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We isolate every user&apos;s data at the database layer, store API keys
        only as cryptographic hashes, serve traffic over TLS, and restrict
        operator access to incidents, support escalations you initiate, and legal
        process. Our current practices are described at{" "}
        <a href="/security">Security</a>. No system is perfectly secure; if you
        find a vulnerability, please report it through{" "}
        <a href="/responsible-disclosure">responsible disclosure</a>.
      </p>

      <h2>8. Data breach notification</h2>
      <p>
        If a personal data breach occurs, we notify the regulators and the
        affected people required by the laws that apply to you:
      </p>
      <ul>
        <li>
          <strong>India — Digital Personal Data Protection Act, 2023 and DPDP
          Rules, 2025, Rule 7.</strong> We intimate the Data Protection Board of
          India without delay with a description of the breach, and within 72
          hours (or a longer period the Board allows on written request) with
          the detailed information the Rules require. We also intimate each
          affected Data Principal without delay, in clear and plain language,
          through your account or the contact details you gave us — describing
          the breach and its likely consequences for you, the measures taken to
          mitigate it, the safety measures you can take, and a contact who can
          answer your questions.
        </li>
        <li>
          <strong>EU and UK — GDPR Article 33 and 34.</strong> We notify the
          competent supervisory authority without undue delay and, where
          feasible, within 72 hours of becoming aware of the breach, and we
          notify you without undue delay where the breach is likely to result in
          a high risk to your rights and freedoms.
        </li>
        <li>
          <strong>United States.</strong> We notify affected residents, and the
          state attorney general or other authority where the state law requires
          it, without unreasonable delay and within the deadlines each
          applicable state breach-notification law sets. Where we must
          coordinate with law enforcement, we will tell you and explain the
          delay.
        </li>
      </ul>
      <p>
        Any notice we send will describe what happened, what data was involved,
        what we have done, what we recommend you do, and how to reach a person
        who can answer questions.
      </p>

      <h2>9. International data transfers</h2>
      <p>
        We operate the Service from the United States and use service providers
        in the United States and the European Union. Your personal information
        may therefore be processed outside your country of residence, including
        in a country whose privacy laws differ from yours. Where the GDPR
        applies, we rely on appropriate safeguards for those transfers —
        standard contractual clauses, or an applicable adequacy decision. Where
        India&apos;s DPDP Act applies, transfers are made subject to any
        restrictions the Central Government specifies under Rule 15 of the DPDP
        Rules, 2025.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is not directed to, and is not intended for use by, anyone
        under 18. We do not knowingly collect personal data from a child without
        the consent required by applicable law, and we delete it if we learn we
        have collected it. In India, the DPDP Act also requires verifiable
        parental consent before processing a child&apos;s personal data; we
        avoid that situation entirely by not serving children.
      </p>

      <h2>11. Notice to European users</h2>
      <p>
        <strong>Scope.</strong> This section applies to you if you are in the
        European Economic Area, the United Kingdom, or Switzerland (together
        &quot;Europe&quot;). &quot;Personal information&quot; here means
        &quot;personal data&quot; as defined by the EU GDPR or UK GDPR. The
        Service is not established in Europe; this notice addresses European
        data-protection law as it applies to offering the Service to people in
        Europe.
      </p>
      <p>
        <strong>Controller.</strong> SophionOS is the controller of the
        processing described in this policy. Contact:{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
      </p>
      <p>
        <strong>Legal bases.</strong> We rely on:
      </p>
      <ul>
        <li>
          <strong>Contractual necessity</strong> to provide the Service you
          asked for — your account, your workspace, export, and deletion.
        </li>
        <li>
          <strong>Legal obligation</strong> for tax, accounting, and lawful
          requests.
        </li>
        <li>
          <strong>Legitimate interests</strong> in keeping the Service secure
          and working, preventing abuse, and improving it, where your rights and
          freedoms do not override those interests.
        </li>
        <li>
          <strong>Consent</strong> where you choose to connect an AI client or
          enable an optional email. You can withdraw consent at any time; that
          withdrawal does not affect processing that already happened.
        </li>
      </ul>
      <p>
        <strong>Your rights.</strong> You may ask us to give you access to your
        personal data, correct inaccuracies, delete it where there is no
        continuing reason to keep it, provide it in a machine-readable format
        for transfer, restrict our processing, or object to processing we base
        on legitimate interests (including for direct marketing). Where we rely
        on consent, you may withdraw it at any time. To exercise a right, email{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>; we
        may need to verify your identity and will answer within one month, or
        tell you why an extension applies. You can also lodge a complaint with
        the supervisory authority in your country of residence. We handle
        requests under the EU and UK GDPR through the same channel as our DPDP
        rights process in §13.
      </p>
      <p>
        <strong>No automated decision-making.</strong> We do not make decisions
        about you through automated processing that produce legal or similarly
        significant effects.
      </p>

      <h2>12. Notice to U.S. state residents</h2>
      <p>
        If you live in a state with a comprehensive consumer privacy law —
        California, Colorado, Connecticut, Virginia, and the other states that
        have enacted one — you have the rights that state grants. For California
        residents, under the CCPA as amended by the CPRA, you have the right to
        know what personal information we collect, use, and disclose; to delete
        it; to correct it; to opt out of its sale or sharing; to limit the use of
        sensitive personal information; and not to be discriminated against for
        exercising these rights. We do not sell personal information, we do not
        share it for cross-context behavioral advertising, and we do not use
        sensitive personal information beyond what is necessary to provide the
        Service — so there is nothing to opt out of, but you may still ask us to
        confirm that.
      </p>
      <p>
        <strong>Categories collected in the last 12 months:</strong>{" "}
        identifiers (email, name, account id), internet or network activity
        (log data), commercial information (founding-seat payments), and
        user-generated content (your workspace). <strong>Sources:</strong> you,
        Clerk, and Dodo Payments. <strong>Disclosed to:</strong> the service
        providers listed in §3. <strong>Retention:</strong> §5.
      </p>
      <p>
        To exercise a right, email{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>. We
        will verify your identity against your account email and respond within
        the period the applicable law allows. You can use an authorized agent
        where your state permits it.
      </p>

      <h2>13. Notice to users in India</h2>
      <p>
        This section applies if you are in India, or if the Digital Personal Data
        Protection Act, 2023 (&quot;<strong>DPDP Act</strong>&quot;) and the
        Digital Personal Data Protection Rules, 2025 (&quot;<strong>DPDP
        Rules</strong>&quot;) otherwise apply to our processing of your personal
        data.
      </p>
      <p>
        <strong>Who is who.</strong> You are the{" "}
        <strong>Data Principal</strong>. SophionOS is the{" "}
        <strong>Data Fiduciary</strong> for the personal data you give us and
        for the workspace content you create here. Our service providers act as
        our Data Processors. See <a href="/subprocessors">Subprocessors</a>.
      </p>
      <p>
        <strong>Consent and notice.</strong> We process your personal data only
        on the basis you give us when you create an account — your consent — to
        provide the Service. This policy is the notice the DPDP Rules require: it
        states the personal data we collect, the purposes of processing, how to
        withdraw consent, and how to exercise your rights or complain. You can
        withdraw consent at any time, but withdrawing it ends our ability to
        provide the Service to you, since processing the workspace is the
        Service. Withdrawing consent does not affect processing done before the
        withdrawal.
      </p>
      <p>
        <strong>Your rights as a Data Principal.</strong>
      </p>
      <ul>
        <li>
          <strong>Access</strong> — obtain a summary of the personal data we
          process about you and of our processing.
        </li>
        <li>
          <strong>Correction and erasure</strong> — correct inaccurate or
          misleading data, and erase data no longer needed for its purpose,
          unless retention is required by law.
        </li>
        <li>
          <strong>Nomination</strong> — nominate another person to exercise
          your rights in the event of your death or incapacity.
        </li>
        <li>
          <strong>Grievance redressal</strong> — use the process in the next
          paragraph.
        </li>
      </ul>
      <p>
        <strong>How to exercise your rights.</strong> Email{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a> from
        your account email address, or use Settings → Privacy &amp; data to
        export or delete. We may ask for the information needed to identify you.
        We act on a request within a reasonable period, and never later than 90
        days from the date you raise a grievance — as required by Rule 14(3) of
        the DPDP Rules, 2025. If we need more time or cannot fulfil a request, we
        will tell you why in writing.
      </p>
      <p>
        <strong>Grievances.</strong> Write to{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a> with
        the subject line &quot;DPDP grievance&quot;. We respond within the
        90-day period above. If we do not resolve your grievance, you may
        complain to the <strong>Data Protection Board of India</strong>.
      </p>
      <p>
        <strong>Breach notification.</strong> Covered in §8, including the
        72-hour intimation to the Board.
      </p>
      <p>
        <strong>Retention and deletion.</strong> When you delete your account we
        erase your personal data after the 14-day grace period, subject to the
        legal retention in §5. Rule 8 of the DPDP Rules imposes a fixed
        inactivity-triggered erasure period on large e-commerce entities,
        online gaming intermediaries, and social media intermediaries listed in
        the Third Schedule; SophionOS is none of those, so that fixed period does
        not apply to your workspace, and we keep it until you delete it or
        delete your account. If we ever become a fiduciary covered by the Third
        Schedule, we will apply the specified period and notify you at least 48
        hours before erasure, as Rule 8 requires.
      </p>
      <p>
        <strong>Children.</strong> The Service is for people 18 and over. We do
        not seek verifiable parental consent because we do not process
        children&apos;s personal data; if we learn that we have, we will delete
        it.
      </p>
      <p>
        <strong>Cross-border transfer.</strong> Our infrastructure is outside
        India. Your data is transferred out of India for processing, subject to
        any restriction the Central Government specifies under Rule 15.
      </p>

      <h2>14. Changes to this policy</h2>
      <p>
        We may update this policy. We change the version and effective date at
        the top of the page, and where a change is material and we have your
        email, we tell you before it takes effect. Continuing to use the Service
        after the effective date means the updated policy applies to your use
        from then on.
      </p>

      <h2>15. How to contact us</h2>
      <p>
        Privacy questions, access, deletion, correction, nomination, and
        grievances:{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>. We
        read every message. Security issues: see{" "}
        <a href="/responsible-disclosure">responsible disclosure</a>.
      </p>
      <p>
        Related: <a href="/terms">Terms</a> ·{" "}
        <a href="/security">Security</a> · <a href="/data-and-ai">Data &amp; AI</a>{" "}
        · <a href="/subprocessors">Subprocessors</a>
      </p>
    </TrustPage>
  );
}
