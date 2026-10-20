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
        version="3.0"
        effective="October 19, 2026"
        summary="Adopts the reviewed, corrected SophionOS legal text (Privacy Policy v2, effective 19 October 2026), including the single general breach-notification commitment in section 11 and the jurisdiction deadlines it names; still DRAFT pending counsel sign-off."
      />
      <p className="text-sm text-muted-foreground">
        <strong>DRAFT — NOT YET IN FORCE.</strong> This document is product
        text awaiting review by qualified Indian counsel. It must not be
        published as binding until counsel signs it off. Every clause is
        subject to that review. The grievance officer details in section 9 are
        placeholders and must be replaced with a real, monitored contact before
        launch.
      </p>

      <p>
        This Privacy Policy explains what personal data SophionOS collects, why
        we collect it, who we share it with, how long we keep it, and the rights
        you have over it. It is a separate document from our{" "}
        <a href="/terms">Terms &amp; Conditions</a> and our Marketing &amp;
        Communications Policy, and you consent to each independently.
      </p>

      <h2>1. Who we are and what this covers</h2>
      <p>
        SophionOS is a life operating system and system of record for
        interconnected life domains: areas, goals, projects, tasks, notes,
        resources, topics, and contacts. In this Policy, &quot;SophionOS&quot;,
        &quot;we&quot;, &quot;us&quot; means Taha Aalam, a sole proprietor trading as
        SophionOS, who operates the SophionOS Cloud service. &quot;You&quot; means
        the person using it.
      </p>
      <p>
        This Policy covers the SophionOS Cloud service. A self-hosted instance
        you operate is governed by the operator&apos;s configuration, not by this
        Policy. See <a href="/terms">Self-hosted Core vs Cloud</a> in the Terms
        for what that means for processors and legal basis.
      </p>

      <h2>2. Consent, and how we record it</h2>
      <p>
        We do not ask for blanket consent. Each document is a separate consent
        item, and you can consent to them independently:
      </p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Required?</th>
            <th>What it covers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Terms &amp; Conditions</td>
            <td>Required</td>
            <td>The rules for using the service</td>
          </tr>
          <tr>
            <td>Privacy Policy</td>
            <td>Required</td>
            <td>This document</td>
          </tr>
          <tr>
            <td>Marketing &amp; Communications</td>
            <td>
              Optional, <strong>off by default</strong>
            </td>
            <td>Promotional email only</td>
          </tr>
        </tbody>
      </table>
      <p>
        Two of the three are required because the service cannot function without
        them. The third is optional and is never pre-ticked.
      </p>
      <p>
        There is no consent banner, because there is nothing to consent to: the
        documents above are the terms on which the Service is offered, and using
        the Service is the acceptance. We keep no consent log, no consent
        ledger, and no per-version consent record, so there is no record of a
        decision to look up or to withdraw from — the version of each document
        in force is the version line at the top of that document.
      </p>
      <p>
        To withdraw consent to marketing, use the unsubscribe link in any
        message, or write to us; service and security notices are not marketing
        and are sent regardless. To withdraw consent to the Terms or the Privacy
        Policy, delete your account from Settings → Privacy &amp; data.
        Withdrawing is exactly as easy as granting, and takes effect immediately.
      </p>
      <p>
        If a document changes materially, we publish a new version with its own
        version number and effective date, and we tell you before it takes
        effect (see section 16). We will not retroactively apply a new version
        to the terms you accepted under an older one.
      </p>

      <h2>3. What we collect, and why</h2>
      <p>
        We collect the minimum needed to run a personal life-management
        product. Each row states a distinct purpose. We do not reuse your data
        for a purpose not listed here; introducing a new purpose requires a new
        version of this Policy, published before any new collection.
      </p>

      <h3>3.1 Account and identity</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Purpose</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email address</td>
            <td>Sign-in, account recovery, security alerts</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Name (optional)</td>
            <td>Personalising the interface</td>
            <td>Consent</td>
          </tr>
          <tr>
            <td>Session tokens and authentication events</td>
            <td>Keeping you signed in, detecting account takeover</td>
            <td>Legitimate interests</td>
          </tr>
          <tr>
            <td>IP address and request logs</td>
            <td>Security, rate-limiting, debugging, and abuse prevention</td>
            <td>Legitimate interests</td>
          </tr>
          <tr>
            <td>Founding Cohort seat purchase</td>
            <td>Confirming and honouring a seat you paid for</td>
            <td>Performance of contract; legal obligation</td>
          </tr>
        </tbody>
      </table>
      <p>
        Authentication is handled by Clerk. We receive your Clerk user id; we do
        not receive your password.
      </p>

      <h3>3.2 Your content</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Purpose</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Areas, goals, projects, tasks, notes, resources, topics, contacts
            </td>
            <td>The core service</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>
              Note content, contact details (email, phone, professional links),
              descriptions, resource URLs
            </td>
            <td>
              The core service, stored encrypted at the application layer
            </td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Full-text search index over the above</td>
            <td>Searching your own content</td>
            <td>Performance of contract</td>
          </tr>
        </tbody>
      </table>
      <p>
        This is your data. We do not sell it, and we do not use it to train
        models.
      </p>

      <h3>3.3 Product operation</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Purpose</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account settings and preferences</td>
            <td>Remembering how you configured the app</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>
              API key metadata (name, expiry, last used, revoked; hashed secrets
              only)
            </td>
            <td>Letting you manage programmatic access</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Subscription and billing records</td>
            <td>Running subscriptions and invoices</td>
            <td>Performance of contract; legal obligation</td>
          </tr>
          <tr>
            <td>Security and access logs</td>
            <td>Detecting abuse, investigating incidents</td>
            <td>Legitimate interests</td>
          </tr>
          <tr>
            <td>Support tickets and messages</td>
            <td>Answering your support requests</td>
            <td>Performance of contract</td>
          </tr>
        </tbody>
      </table>
      <p>
        Raw API key secrets are never stored and never exported. Only hashes
        are.
      </p>

      <h3>3.4 AI clients you connect</h3>
      <p>
        AI clients are available to signed-in users. They work only for the
        purposes listed below, and only for the version of this Policy you
        accepted.
      </p>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Purpose</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Workspace content an authorized client requests</td>
            <td>Serving the client you connected</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>
              API key metadata (name, expiry, last used, revoked; hashed secrets
              only)
            </td>
            <td>Letting the client authenticate to SophionOS</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Prompts and responses handled by the client and its provider</td>
            <td>
              Answering your query, under that provider&apos;s own terms
            </td>
            <td>Consent (by connecting the client)</td>
          </tr>
        </tbody>
      </table>
      <p>
        If you create an API key and connect Claude, Cursor, Codex, or another
        MCP client, that client calls SophionOS and its provider processes what
        it receives. This happens only because you set it up, and it is outside
        our control after the request leaves us. See{" "}
        <a href="/data-and-ai">Data &amp; AI</a>.
      </p>
      <p>
        If a client is ever extended to a new data type or a new use — for
        example, reading content you have not opened — that is a new purpose. It
        is not added to this list silently: it requires a new version of this
        Policy, published before anything new is collected. See Settings → AI
        Access to review and revoke AI access at any time.
      </p>

      <h3>3.5 Telemetry</h3>
      <p>
        We do not send your content, notes, contacts, or prompts to any
        third-party analytics provider. We do collect aggregate, non-content
        operational metrics about how the service performs.
      </p>

      <h2>4. Where your data goes</h2>
      <table>
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Why</th>
            <th>Where</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Clerk</td>
            <td>Authentication</td>
            <td>Their infrastructure, region per your Clerk account</td>
          </tr>
          <tr>
            <td>Supabase (or your self-hosted Postgres)</td>
            <td>Primary database hosting</td>
            <td>Your configured region</td>
          </tr>
          <tr>
            <td>Vercel (hosted)</td>
            <td>Application hosting and edge delivery</td>
            <td>Their infrastructure, global edge</td>
          </tr>
          <tr>
            <td>
              Dodo Payments (Dodo Payments Inc., Dodope Payments Limited, and
              Sarvapanchhi Technologies Private Limited)
            </td>
            <td>
              Subscription billing and the one-time founding-seat checkout;
              merchant of record — see 4.1
            </td>
            <td>Their infrastructure, United States and India</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Transactional email delivery</td>
            <td>Their infrastructure, United States</td>
          </tr>
          <tr>
            <td>Cron and job infrastructure</td>
            <td>Scheduling briefs and background jobs</td>
            <td>Their infrastructure, United States</td>
          </tr>
        </tbody>
      </table>
      <p>
        Payments are processed by Dodo Payments, which sells to you as merchant
        of record; section 4.1 says exactly what goes to them and what they do
        with it. Transactional email providers receive your email address and
        the content of the message being delivered.
      </p>
      <p>
        The current list of subprocessors is published at{" "}
        <a href="/subprocessors">the subprocessors page</a>. We will give notice
        before adding a subprocessor that can access your content, and you may
        object on reasonable grounds.
      </p>
      <p>
        We do <strong>not</strong> share your personal data for advertising. We
        do not sell it to anyone, in any form.
      </p>

      <h3>4.1 Payment processing</h3>
      <p>
        <strong>Who sells to you.</strong> Paid plans and the one-time founding
        seat are sold by &quot;Dodo Payments&quot; (as defined in Dodo Payments&apos;
        Master Service Agreement — Dodo Payments Inc., Dodope Payments Limited,
        and Sarvapanchhi Technologies Private Limited, collectively the merchant
        of record), acting as our <strong>merchant of record</strong>. Dodo
        Payments is the seller of record for that purchase: it takes your
        payment, issues the invoice, applies and remits applicable taxes, and
        issues any refund to the card you paid with. The contract for the
        purchase is between you and Dodo Payments, under Dodo Payments&apos; own
        terms of sale. Your use of the Service itself is governed by the{" "}
        <a href="/terms">Terms &amp; Conditions</a>, which are between you and
        Taha Aalam.
      </p>
      <p>
        <strong>What goes to Dodo Payments.</strong> At checkout Dodo Payments
        receives:
      </p>
      <ul>
        <li>
          your <strong>name</strong> and <strong>email address</strong>;
        </li>
        <li>
          your <strong>billing details</strong>, including your billing address
          and country;
        </li>
        <li>
          the <strong>payment record</strong> — the amount, the currency, the
          payment method, the transaction status, and the timestamps of the
          payment;
        </li>
        <li>
          your <strong>card details</strong>, which go to Dodo Payments and its
          payment service providers and never reach us. We never see or store
          them.
        </li>
      </ul>
      <p>
        <strong>Whose privacy policy applies.</strong> For that payment data,
        Dodo Payments acts on its own account: it decides why and how the data
        is processed, to sell to you and to meet its own legal, tax, and
        fraud-prevention obligations. Dodo Payments&apos; own privacy policy
        applies to that data and governs your rights over it:{" "}
        <a href="https://dodopayments.com/privacy-policy">
          dodopayments.com/privacy-policy
        </a>
        . We are the Data Fiduciary for the data you create in the Service
        (section 15) and for your account data; what comes back to us is only
        what we need to grant the entitlement — your name and email, the payment
        and subscription identifiers, and the fact that a payment succeeded.
      </p>

      <h2>5. Cookies and local storage</h2>
      <p>
        We use a session cookie to keep you signed in. We use local storage for
        interface preferences, and a first-party identifier so a logged-out
        visitor can be linked to their account when they sign up.
      </p>
      <p>
        We do not use advertising cookies, cross-site tracking cookies, or
        fingerprinting.
      </p>

      <h2>6. How long we keep your data</h2>
      <table>
        <thead>
          <tr>
            <th>Data category</th>
            <th>Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Your account and content</td>
            <td>
              Until you delete your account, then purged within{" "}
              <strong>30 days</strong> of the deletion request completing
            </td>
          </tr>
          <tr>
            <td>Security and access logs</td>
            <td>
              <strong>12 months</strong> from the event
            </td>
          </tr>
          <tr>
            <td>Database backups</td>
            <td>
              <strong>30 days</strong>, rolling — a backup may contain data that
              has already been deleted from the live database
            </td>
          </tr>
          <tr>
            <td>Marketing consent state</td>
            <td>
              Held with your email subscription. An opt-out is permanent, so no
              address ever restarts receiving marketing
            </td>
          </tr>
          <tr>
            <td>Grievance records</td>
            <td>
              <strong>36 months</strong> from closure
            </td>
          </tr>
          <tr>
            <td>Consent record</td>
            <td>
              None is kept. Acceptance is the use of the Service itself (section
              2), so there is nothing separate to retain
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Two things follow from the backup window, stated plainly rather than
        hidden: if you delete your account, a snapshot taken up to 30 days
        earlier may still contain your data until that snapshot ages out of the
        rotation; and we keep no consent log, because using the Service is the
        acceptance and the version of this document in force is what you agreed
        to.
      </p>
      <p>
        We keep billing, tax, and accounting records for as long as the law
        requires. We keep security and access logs for at least one year — India
        requires at least one year for data fiduciaries processing under the
        DPDP Rules, 2025, and the same window covers our incident investigation
        needs everywhere.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You have the following rights. Each one has an in-app control, not just
        a policy paragraph, and each is usable without emailing anyone.
      </p>
      <table>
        <thead>
          <tr>
            <th>Right</th>
            <th>How to exercise it</th>
            <th>When we respond</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Access / portability</strong>
            </td>
            <td>
              Settings → Privacy &amp; data → <strong>Download your data</strong>{" "}
              gives you a JSON file of your personal data
            </td>
            <td>Immediately</td>
          </tr>
          <tr>
            <td>
              <strong>Correction</strong>
            </td>
            <td>
              Settings → <strong>Preferences</strong> for your timezone and
              language. Your name, username, phone and photo are corrected in
              Settings → <strong>Profile</strong>; your content is corrected
              where you created it. Anything you cannot edit, correct by
              grievance
            </td>
            <td>Immediately</td>
          </tr>
          <tr>
            <td>
              <strong>Erasure</strong>
            </td>
            <td>
              Settings → Privacy &amp; data → <strong>Delete my data and
              account</strong>, with a typed confirmation
            </td>
            <td>Purge within 30 days</td>
          </tr>
          <tr>
            <td>
              <strong>Withdraw consent</strong>
            </td>
            <td>
              Delete your account from Settings → Privacy &amp; data, or use the
              unsubscribe link in any marketing email
            </td>
            <td>Immediately</td>
          </tr>
          <tr>
            <td>
              <strong>Nomination</strong>
            </td>
            <td>Contact the grievance officer</td>
            <td>Within 15 days</td>
          </tr>
          <tr>
            <td>
              <strong>Grievance redressal</strong>
            </td>
            <td>By email to the grievance officer (section 9)</td>
            <td>Acknowledged within 48 hours, resolved within 15 days</td>
          </tr>
          <tr>
            <td>
              <strong>Complaint to the Board</strong>
            </td>
            <td>
              You may complain to the Data Protection Board at any time, in
              addition to or instead of contacting us
            </td>
            <td>As per the Board&apos;s process</td>
          </tr>
        </tbody>
      </table>
      <p>
        Withdrawing consent to marketing stops every promotional email
        immediately, with no other effect. Withdrawing consent to the Terms or
        the Privacy Policy means the service can no longer lawfully operate for
        you, so it closes your account — the app tells you this before you
        confirm, and asks you to type to confirm.
      </p>

      <h2>8. Children and under-18 users</h2>
      <p>
        The service is not directed at children and is not intended for anyone
        under 18. We do not knowingly collect personal data from children under
        18.
      </p>
      <p>
        The Service is for people 18 and over, so we do not ask for an age
        declaration and we do not record one. We do not seek verifiable
        parental consent, because we do not process children&apos;s personal data;
        if we learn that we have, we will delete it.
      </p>
      <p>
        If you believe a child under 18 has created an account or provided
        personal data, contact the grievance officer. We will delete that data
        on verification and will not hold it while the question is
        investigated, beyond what we need to verify the report.
      </p>
      <p>
        We do not knowingly serve advertising to children, and we do not use
        behavioural advertising at all.
      </p>

      <h2>9. Grievance redressal</h2>
      <p>
        Every Data Principal has the right to lodge a grievance with us and to
        receive a response.
      </p>
      <p>
        <strong>Grievance Officer</strong>
      </p>
      <table>
        <thead>
          <tr>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td>
              <strong>Taha Aalam</strong>
            </td>
          </tr>
          <tr>
            <td>Email</td>
            <td>
              <strong>
                <a href="mailto:privacy@sophionos.com">
                  privacy@sophionos.com
                </a>
              </strong>
            </td>
          </tr>
          <tr>
            <td>Postal address</td>
            <td>
              <strong>
                B202, Wellington Park Apartment, Wellington Street, Richmond
                Town, Bangalore, Karnataka 560025, India
              </strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Taha Aalam, a sole proprietor trading as SophionOS, is the designated
        grievance officer. The mailbox is monitored and the postal address is
        published, so a grievance can be raised in writing.
      </p>
      <p>
        <strong>What you can expect</strong>
      </p>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Commitment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Acknowledgement</td>
            <td>
              Within <strong>48 hours</strong> of us receiving your grievance
            </td>
          </tr>
          <tr>
            <td>Resolution</td>
            <td>
              Within <strong>15 days</strong>
            </td>
          </tr>
          <tr>
            <td>Status updates</td>
            <td>At least every 5 days while it is open</td>
          </tr>
          <tr>
            <td>Escalation</td>
            <td>
              If you are not satisfied, you may complain to the Data Protection
              Board of India
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Raise a grievance by emailing the officer at{" "}
        <a href="mailto:privacy@sophionos.com">privacy@sophionos.com</a> with
        the subject line &quot;DPDP grievance&quot;.
      </p>
      <p>
        When you raise a grievance we will ask only for what we need to
        investigate it. We will not ask you to send passwords, API keys, or the
        content of your notes.
      </p>

      <h2>10. Security</h2>
      <p>
        We encrypt sensitive fields at the application layer before they reach
        the database, and use row-level database policies as the primary
        isolation boundary. We store API keys only as cryptographic hashes, and
        we keep no consent log or consent record, because acceptance is the use
        of the Service itself (section 2). Access to production data by staff is
        limited, logged, and reviewed.
      </p>
      <p>
        No system is perfectly secure. If a breach affects your personal data,
        we will notify you and the Data Protection Board without delay and tell
        you what we know about it. Our response procedure is published at{" "}
        <code>docs/breach-response.md</code>. See <a href="/security">Security</a>{" "}
        for the full statement of what we do and do not claim.
      </p>

      <h2>11. Data breach notification</h2>
      <p>
        If a personal data breach occurs, we contain it first, then notify. In
        the event of a personal data breach, we will notify affected users and
        relevant authorities without undue delay, in accordance with applicable
        law.
      </p>
      <p>
        Where the Digital Personal Data Protection Act, 2023 and the DPDP Rules,
        2025 apply to you, we intimate the Data Protection Board of India and
        each affected Data Principal without delay. We notify on what we know at
        the time: notification is not gated on finishing the investigation, and
        we tell the authority what changed afterwards.
      </p>
      <p>
        Where the GDPR applies to you, we notify the relevant supervisory
        authority within 72 hours of becoming aware of a personal data breach,
        in accordance with GDPR Article 33 (and the equivalent requirement under
        applicable law where you are). We notify affected users without undue
        delay where the breach is likely to result in high risk to their rights,
        in accordance with GDPR Article 34.
      </p>
      <p>
        For users in the United States, we apply the same 72-hour target, which
        meets or exceeds the notification deadlines under applicable state
        breach-notification laws.
      </p>
      <p>
        Any notice we send describes what happened, what data was involved, what
        we have done, what we recommend you do, and how to reach a person who
        can answer questions.
      </p>

      <h2>12. International data transfers</h2>
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

      <h2>13. Notice to European users</h2>
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
        <strong>Controller.</strong> Taha Aalam, a sole proprietor trading as
        SophionOS, is the controller of the processing described in this Policy.
        Contact:{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
        Payment data is the one exception: Dodo Payments sells to you as
        merchant of record and decides how that data is processed — see section
        4.1.
      </p>
      <p>
        <strong>Legal bases.</strong> We rely on:
      </p>
      <ul>
        <li>
          contractual necessity to provide the Service you asked for — your
          account, your workspace, export, and deletion;
        </li>
        <li>legal obligation for tax, accounting, and lawful requests;</li>
        <li>
          legitimate interests in keeping the Service secure and working,
          preventing abuse, and improving it, where your rights and freedoms do
          not override those interests;
        </li>
        <li>
          consent where you choose to connect an AI client or enable an
          optional email. You can withdraw consent at any time; that withdrawal
          does not affect processing that already happened.
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
        the supervisory authority in your country of residence.
      </p>

      <h2>14. Notice to U.S. state residents</h2>
      <p>
        If you live in a state with a comprehensive consumer privacy law —
        California, Colorado, Connecticut, Virginia, and the other states that
        have enacted one — you have the rights that state grants. For California
        residents, under the CCPA as amended by the CPRA, you have the right to
        know what personal information we collect, use, and disclose; to delete
        it; to correct it; to opt out of its sale or sharing; to limit the use
        of sensitive personal information; and not to be discriminated against
        for exercising these rights. We do not sell personal information, we do
        not share it for cross-context behavioral advertising, and we do not use
        sensitive personal information beyond what is necessary to provide the
        Service — so there is nothing to opt out of, but you may still ask us to
        confirm that.
      </p>
      <p>
        Categories collected in the last 12 months: identifiers (email, name,
        account id), internet or network activity (log data), commercial
        information (subscription and founding-seat payments), and user-generated
        content (your workspace). Sources: you, Clerk, and Dodo Payments.
        Disclosed to: the service providers listed in section 4. Retention:
        section 6.
      </p>
      <p>
        To exercise a right, email{" "}
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>. We
        will verify your identity against your account email and respond within
        the period the applicable law allows. You can use an authorized agent
        where your state permits it.
      </p>

      <h2>15. Notice to users in India</h2>
      <p>
        This section applies if you are in India, or if the Digital Personal
        Data Protection Act, 2023 (&quot;DPDP Act&quot;) and the Digital Personal
        Data Protection Rules, 2025 (&quot;DPDP Rules&quot;) otherwise apply to our
        processing of your personal data.
      </p>
      <p>
        <strong>Who is who.</strong> You are the <strong>Data Principal</strong>.
        Taha Aalam, a sole proprietor trading as SophionOS, is the{" "}
        <strong>Data Fiduciary</strong> for the personal data you give us and
        for the workspace content you create here. Our service providers act as
        our Data Processors. Dodo Payments is the exception: as merchant of
        record it holds the payment data as a Data Fiduciary in its own right,
        not as our processor (section 4.1). See{" "}
        <a href="/subprocessors">Subprocessors</a>.
      </p>
      <p>
        <strong>Consent and notice.</strong> We process your personal data only
        on the basis you give us when you create an account — your consent — to
        provide the Service. This Policy is the notice the DPDP Rules require:
        it states the personal data we collect, the purposes of processing, how
        to withdraw consent, and how to exercise your rights or complain. You
        can withdraw consent at any time, but withdrawing it ends our ability to
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
          incomplete personal data, and have personal data you have given us
          erased, in each case as described in section 7.
        </li>
        <li>
          <strong>Grievance redressal</strong> — raise a grievance with our
          Grievance Officer, in the manner and within the timescales set out in
          section 9, and never later than 90 days from the date you raise it, as
          required by Rule 14(3) of the DPDP Rules, 2025.
        </li>
        <li>
          <strong>Nomination</strong> — nominate a person to exercise the
          rights above on your behalf in the event of your death or incapacity.
        </li>
        <li>
          <strong>Withdraw consent</strong> — as described in section 2, at any
          time, with the same ease as giving it.
        </li>
        <li>
          <strong>Complaint to the Board</strong> — complain to the Data
          Protection Board of India at any time, in addition to or instead of
          contacting us.
        </li>
      </ul>
      <p>
        <strong>The safeguards we take.</strong> Where the DPDP Rules, 2025
        apply, Rule 6 requires a Data Fiduciary to take minimum safeguards. We
        meet them as set out in the table in <a href="/security">Security</a>:
        encryption in transit and at rest, hashed API keys, per-user row
        isolation, and a global AI disable switch. Rule 14 requires us to
        publish a grievance process and the contact details of the Grievance
        Officer — section 9 is that notice. Rule 15 governs transfers out of
        India, addressed in section 12.
      </p>
      <p>
        <strong>Erasure.</strong> Rule 8 of the DPDP Rules imposes a fixed
        inactivity-triggered erasure period on large e-commerce entities, online
        gaming intermediaries, and social media intermediaries listed in the
        Third Schedule. SophionOS is none of those, so that fixed period does
        not apply to your workspace, and we keep it until you delete it or
        delete your account. If we ever become a fiduciary covered by the Third
        Schedule, we will apply the specified period and notify you at least 48
        hours before erasure, as Rule 8 requires.
      </p>

      <h2>16. Changes to this Policy</h2>
      <p>
        A change is published as a new version with its own version number and
        effective date. Material changes are surfaced to you before they take
        effect, and continuing to use the Service after the effective date
        means the updated policy applies to your use from then on. We will not
        retroactively apply a new version to the terms you accepted under an
        older one.
      </p>

      <h2>17. Contact</h2>
      <p>
        <strong>
          <a href="mailto:privacy@sophionos.com">privacy@sophionos.com</a>
        </strong>
        , monitored. This is the address for privacy matters and for grievances
        about this Policy. The operator is Taha Aalam, a sole proprietor
        trading as SophionOS. See section 9 for the grievance officer.
      </p>

      <p className="text-sm text-muted-foreground">
        <strong>Status: DRAFT.</strong> This document requires review by
        qualified Indian counsel before it is published as binding.
      </p>

      <p>
        Related: <a href="/terms">Terms</a> ·{" "}
        <a href="/security">Security</a> · <a href="/data-and-ai">Data &amp; AI</a>{" "}
        · <a href="/subprocessors">Subprocessors</a>
      </p>
    </TrustPage>
  );
}
