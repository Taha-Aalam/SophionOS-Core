import { PolicyMeta } from "@/components/trust/policy-meta";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Terms & Conditions | SophionOS",
  description:
    "The terms that govern use of the SophionOS platform: the service, accounts, plans and limits, founding seats, acceptable use, API and MCP access, your content, billing, disputes, and governing law.",
};

export default function TermsPage() {
  return (
    <TrustPage
      emoji="📜"
      title="Terms & Policies"
      description="The terms that govern use of the SophionOS platform: the service, accounts, plans and limits, founding seats, acceptable use, API and MCP access, your content, billing, disputes, and governing law."
    >
      <PolicyMeta
        version="3.0"
        effective="October 19, 2026"
        summary="Adopts the reviewed and corrected SophionOS Terms & Conditions v2, effective 19 October 2026; the text is still DRAFT pending sign-off by qualified Indian counsel."
      />
      <p className="text-sm text-muted-foreground">
        <strong>DRAFT — NOT YET IN FORCE.</strong> This document is product text
        awaiting review by qualified Indian counsel. It must not be published as
        binding until counsel signs it off. Every clause is subject to that
        review.
      </p>

      <h2>Terms &amp; Conditions of Use</h2>

      <p>
        These Terms govern your access to and use of the SophionOS platform,
        including the hosted SophionOS Cloud service and any self-hosted instance
        we distribute (the &quot;Service&quot;). They are a separate document from
        our <a href="/privacy">Privacy Policy</a> and our Marketing &amp;
        Communications Policy. Each is consented to independently.
      </p>

      <h2>1. The service</h2>
      <p>
        SophionOS is a life operating system and system of record for
        interconnected life domains: areas, goals, projects, tasks, notes,
        resources, topics, and contacts, together with the relationships between
        them. The dashboard is the command surface; settings, export, deletion,
        API keys, and the MCP server let you control and connect that context.
      </p>
      <p>
        In these Terms, &quot;SophionOS&quot;, &quot;we&quot;, &quot;us&quot; means Taha
        Aalam, a sole proprietor trading as SophionOS, who operates the
        SophionOS Cloud service, and &quot;you&quot; means the person using it.
        &quot;Service&quot; means the SophionOS Cloud service and the SophionOS
        Core software we distribute for self-hosting.
      </p>
      <p>
        These Terms govern your use of the Service. They are not the contract for
        the purchase itself. Paid plans and Founding Cohort seats are sold by
        &quot;Dodo Payments&quot; (as defined in Dodo Payments&apos; Master Service
        Agreement — Dodo Payments Inc., Dodope Payments Limited, and Sarvapanchhi
        Technologies Private Limited, collectively the merchant of record) as our{" "}
        <strong>merchant of record</strong>: Dodo Payments takes your payment,
        issues the invoice, applies and remits applicable taxes, and issues
        refunds, and your purchase is a contract with Dodo Payments under Dodo
        Payments&apos; terms of sale. Where a charge, an invoice, a tax, a
        refund, or a cancellation of a purchase is concerned, Dodo Payments is
        the counterparty and we are not. Section 4 and section 11 cover the parts
        of that you deal with through us, including a billing error or a
        duplicate charge.
      </p>
      <p>
        SophionOS is provided <strong>as is</strong>. We do not warrant that the
        Service will be uninterrupted, error-free, or fit for a particular
        purpose, except where the law says we must.
      </p>
      <p>
        The Service is under active development. Expect rough edges, schema
        change, and incomplete operator tooling. The REST API (
        <code>/api/v1/*</code>) and the MCP server are{" "}
        <strong>experimental</strong>: interfaces may change, and they are not
        sold as a stable multi-tenant integration contract. See{" "}
        <a href="/security">Security</a> and{" "}
        <a href="/data-and-ai">Data &amp; AI</a> for what is and is not claimed.
      </p>
      <p>
        We may modify, suspend, or discontinue features. Where a change
        materially reduces functionality you rely on, we will give reasonable
        notice in-product before it takes effect.
      </p>

      <h2>2. Accounts and eligibility</h2>
      <p>
        You must be <strong>at least 18 years old</strong> to hold an account. By
        creating an account and accepting these Terms you make a declaration to
        that effect. See the{" "}
        <a href="/privacy">children&apos;s data section</a> of the Privacy
        Policy.
      </p>
      <p>You are responsible for:</p>
      <ul>
        <li>providing accurate registration details and keeping them current;</li>
        <li>
          keeping your credentials confidential and notifying us at once if you
          believe an account has been compromised;
        </li>
        <li>
          all activity that happens under your account, including activity by
          anyone you give access to.
        </li>
      </ul>
      <p>
        Keep one person to one account, and do not share an account between
        multiple people. You are responsible for activity under your sessions
        and API keys until you revoke them or sign out.
      </p>
      <p>
        We may suspend or terminate an account that breaches these Terms, that
        we are required to suspend by law, or that we reasonably believe is
        being used to cause harm. Where the law allows, we will tell you why and
        give you a chance to fix the problem first.
      </p>

      <h2>3. Plans, tiers, and technical limits</h2>
      <p>
        The Service is offered on the plans below. Prices are in US dollars and
        may change; a change never applies retroactively to a period you have
        already paid for. Limits are enforced technically, not merely described:
        an account that exceeds a cap or a rate limit receives an error, not an
        overage.
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
            <td>
              <strong>Free</strong>
            </td>
            <td>$0 forever</td>
            <td>
              The managed personal workspace with a 100-entity cap (areas, goals,
              projects, tasks, notes, resources, contacts, contact logs combined),
              7-day activity retention, and usage through the web app. REST API
              and MCP access are not included and require a paid plan.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Pro</strong>
            </td>
            <td>$15/month</td>
            <td>
              Unlimited entities, REST API and MCP access with per-key expiry,
              labels, scopes, and activity history, knowledge search, and 30-day
              activity retention.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Power</strong>
            </td>
            <td>$30/month</td>
            <td>
              Everything in Pro, plus advanced AI policies, approval workflows for
              sensitive actions, webhooks and event-driven automation, premium
              connectors, priority support, and 365-day activity retention.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Business</strong>
            </td>
            <td>Contact sales</td>
            <td>
              Governed company context and Company Brain: organization workspaces
              and roles, AI access policies and audit logs, permission-aware
              search, SSO and SCIM, SLA and implementation support, and data
              residency options. Governed by a signed order or agreement where
              one exists.
            </td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li>
          <strong>Rate limits are per minute and enforced per plan.</strong> The
          authoritative numbers are published in the app under Settings → AI
          Access. Exceeding a limit returns HTTP 429 — back off and retry.
        </li>
        <li>
          <strong>
            MCP and API routes that require a paid plan return 403 for Free keys.
          </strong>{" "}
          Billing surfaces appear in Settings → Billing only when billing is
          enabled for your deployment.
        </li>
        <li>
          <strong>
            A missing or inactive subscription resolves to free
          </strong>{" "}
          (fail-closed).
        </li>
        <li>
          <strong>
            Self-hosted SophionOS Core has no SophionOS plans, caps, or billing.
          </strong>{" "}
          You run it and you set its limits (section 13).
        </li>
        <li>
          Some Power features reach founding members first, as they ship. Where
          a Power feature has not shipped, we say so in the app and in the
          monthly build notes.
        </li>
      </ul>
      <p>
        We may change a tier&apos;s limits. We will not reduce a paid tier&apos;s
        functionality during a paid period except where a change is required by
        law or to address a security risk, and we will give notice before it
        takes effect.
      </p>

      <h2>4. Founding Cohort seats</h2>
      <p>
        The Founding Cohort is limited to 100 seats. A seat is a one-time
        payment of $150, sold by Dodo Payments as our merchant of record and paid
        through Dodo Payments&apos; hosted checkout, and it grants{" "}
        <strong>two years of Power</strong> from the moment payment is confirmed.
        It is not a subscription and does not renew. We do not store your card
        details.
      </p>
      <ul>
        <li>
          <strong>A seat is reserved when payment is confirmed.</strong> If you
          start checkout and do not finish it, your claim stays on the pending
          list and you will receive a resume link by email, so you can complete
          your seat without starting over.
        </li>
        <li>
          <strong>No recurring charge.</strong> When the included period ends,
          the account resolves to the plan that is then available, and we will
          tell you before that happens.
        </li>
        <li>
          <strong>Refunds.</strong> Full refund on request within 14 days of
          payment, by replying to any email from the founder or writing to{" "}
          <strong>founders@sophionos.com</strong>. Dodo Payments is the merchant
          of record and holds your payment, so the refund is issued by Dodo
          Payments to the original payment method, under Dodo Payments&apos;
          terms of sale. After 14 days the payment is final. Your statutory
          rights where you live are unaffected.
        </li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          use the Service to store or distribute content that is unlawful, that
          infringes someone else&apos;s rights, or that you do not have the
          right to store;
        </li>
        <li>
          attempt to gain access to another person&apos;s account, data, or
          credentials;
        </li>
        <li>
          probe, scan, or test the vulnerability of the Service except under our{" "}
          <a href="/responsible-disclosure">responsible disclosure programme</a>;
        </li>
        <li>
          interfere with the Service&apos;s operation, including by overloading
          it, scraping it, or bypassing rate limits;
        </li>
        <li>
          resell, sublicense, or provide the Service to third parties as a
          competing service, or share one account between multiple people;
        </li>
        <li>
          use the Service to send unsolicited commercial communications, or to
          conduct any activity that infringes the Digital Personal Data
          Protection Act, 2023;
        </li>
        <li>
          misrepresent your identity or your affiliation when raising a
          grievance.
        </li>
      </ul>

      <h2>6. API keys, MCP, and AI clients</h2>
      <p>
        The Service can expose its data to external clients through API keys and
        MCP. When you authorise a client:
      </p>
      <ul>
        <li>it may read and write the data your key authorises;</li>
        <li>
          the model provider that client uses processes whatever that client
          sends, under that provider&apos;s own terms and retention policy, which
          we do not control;
        </li>
        <li>
          you can revoke a key at any time from Settings, and revocation takes
          effect immediately.
        </li>
      </ul>
      <p>
        Once a client is connected, you and the client are responsible for what
        leaves SophionOS. We are responsible for what we serve and refuse:
        authenticating the key, enforcing its mode and scopes, isolating your
        rows, honouring a revoked key, and keeping the activity record. We
        cannot see, instruct, audit, or delete data held by a client or its
        provider. See <a href="/data-and-ai">Data &amp; AI</a>.
      </p>
      <p>
        The API and MCP surfaces are experimental. If you import untrusted
        content into your workspace — for example a note containing text that
        looks like instructions — an AI client reading that note may treat it as
        instructions. Keep write-enabled keys away from untrusted content, and
        prefer read-only keys for assistants that browse or import.
      </p>
      <p>
        An AI client you connect operates only for the data purposes described
        in the{" "}
        <a href="/privacy">Privacy Policy</a>, section 3.4. Connecting it is
        your decision, made with a key you create, and what it does with your
        content afterwards is outside our control.
      </p>

      <h2>7. Your content</h2>
      <p>
        You keep all ownership of the content you put in the Service. We claim no
        ownership of your notes, contacts, tasks, or any other content you
        create.
      </p>
      <p>
        You grant us only the narrow licence needed to operate the Service: to
        host, process, transmit, display, and back up your content for as long as
        you hold an account, and to process it as described in the{" "}
        <a href="/privacy">Privacy Policy</a>. We do not use your content to
        train models. We do not sell your content.
      </p>
      <p>
        You are responsible for having the rights and permissions necessary to
        enter the content you enter.
      </p>

      <h2>8. Feedback</h2>
      <p>
        If you send us feedback, suggestions, or ideas, you grant us a perpetual,
        irrevocable, royalty-free licence to use them without restriction or
        attribution. This does not apply to your content. Do not send us
        feedback you consider confidential.
      </p>

      <h2>9. Suspension and termination</h2>
      <p>
        You may stop using the Service and delete your account at any time from
        Settings, or by contacting us. Account deletion is described in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
      <p>On termination:</p>
      <ul>
        <li>your access ends immediately;</li>
        <li>
          your data is handled as set out in the Privacy Policy&apos;s retention
          and deletion sections, including any legally required retention;
        </li>
        <li>
          sections that by their nature should survive termination survive,
          including ownership, disclaimers, indemnity, and limitation of
          liability.
        </li>
      </ul>

      <h2>10. Intellectual property</h2>
      <p>
        SophionOS, its name, interface, design, and underlying software are owned
        by us or our licensors. We grant you a limited, non-exclusive,
        non-transferable licence to use them as intended under these Terms. No
        other rights are granted.
      </p>
      <p>
        The SophionOS Core software is licensed under AGPL-3.0-or-later. That
        licence governs the software; these Terms govern the hosted Service.
      </p>
      <p>
        SophionOS names, logos, and trade dress are not licensed under the AGPL —
        do not use them to imply endorsement.
      </p>

      <h2>11. Billing and payment</h2>
      <p>
        Paid plans and Founding Cohort seats are sold by Dodo Payments as our
        merchant of record (section 1). Dodo Payments takes the payment, issues
        the invoice, applies and remits applicable taxes, and issues refunds. We
        are not the seller of record and we do not take your payment; what Dodo
        Payments sends us is the entitlement — that a plan is paid for, and for
        which tier.
      </p>
      <p>If you subscribe to a paid tier:</p>
      <ul>
        <li>
          fees are stated in the applicable order and are charged in advance;
        </li>
        <li>
          subscriptions renew automatically until cancelled, at the then-current
          price for your tier, which we will tell you before any price change
          takes effect;
        </li>
        <li>
          you can cancel at any time from Settings → Billing, which opens Dodo
          Payments&apos; customer portal where the subscription is actually
          managed, or by writing to us; cancellation takes effect at the end of
          the paid period, and we do not refund a period already paid for except
          where the law requires it;
        </li>
        <li>
          invoices and legally required records are retained after cancellation —
          the invoice is Dodo Payments&apos;, and we keep the subscription and
          entitlement records;
        </li>
        <li>
          if payment fails and is not resolved within the grace period shown
          in-product, the account moves to the free tier and paid features are
          suspended;
        </li>
        <li>
          prices are exclusive of applicable taxes, which Dodo Payments collects
          and remits.
        </li>
      </ul>
      <p>
        <strong>Charged in error.</strong> If you are charged in error — including
        being charged twice for the same period — write to{" "}
        <strong>founders@sophionos.com</strong> within 60 days of the charge and
        we will refund the erroneous charge. Dodo Payments, as merchant of
        record, issues the refund to the original payment method.
      </p>
      <p>
        Disputes about a charge must be raised within 60 days of the charge date.
        Except for a billing error or duplicate charge, which you raise with us
        as set out above, a dispute about a charge is a dispute with Dodo
        Payments, which is the seller of record: raise it with Dodo Payments
        through the customer portal or the contact details on your invoice.
      </p>
      <p>
        <strong>
          Consumers in the EU, UK, and similar jurisdictions:
        </strong>{" "}
        where a 14-day right of withdrawal applies to a digital subscription, you
        may withdraw within 14 days of purchase. Founding-seat purchases are
        governed by section 4.
      </p>

      <h2>12. Third-party services</h2>
      <p>
        The Service integrates with third parties, including an identity provider
        (Clerk), a managed database (Supabase), an application host (Vercel), and
        a transactional email provider (Resend). Their processing of your data is
        described in the <a href="/privacy">Privacy Policy</a> and in our{" "}
        <a href="/subprocessors">subprocessors list</a>. We are not responsible
        for the content or practices of third-party services you choose to
        connect.
      </p>
      <p>
        Dodo Payments is not in that list, because it is not a service we
        integrate on your behalf: it is our merchant of record and the seller of
        record for paid plans and founding seats (section 1). Dodo Payments
        decides how your payment data is processed, and Dodo Payments&apos; own
        privacy policy applies to it.
      </p>

      <h2>13. Self-hosted SophionOS Core vs SophionOS Cloud</h2>
      <p>
        These Terms govern your use of SophionOS Cloud. The underlying code,
        SophionOS Core, is open source under AGPL-3.0-or-later. If you
        self-host, you are the operator of that deployment: you choose
        processors, regions, backups, TLS, retention, and legal basis, and the
        Cloud specifics in these Terms (plans, billing, hosted subprocessors) do
        not apply to your deployment. Do not describe a self-hosted deployment
        as &quot;data never leaves the device&quot; unless it truly uses no
        network identity, hosted database, or remote AI clients.
      </p>

      <h2>14. Disclaimers</h2>
      <p>
        To the maximum extent permitted by law, we disclaim all warranties,
        express or implied, including merchantability, fitness for a particular
        purpose, title, and non-infringement. We do not warrant that the Service
        will be uninterrupted, secure, or error-free.
      </p>
      <p>
        There has been no formal third-party security audit of this codebase; the
        API/MCP surface is experimental, and residual risks — prompt injection,
        exfiltration you authorise through a client, operator-visible service
        data — remain. Do not rely on SophionOS as the sole store for critical,
        medical, legal, or safety-critical information. Where the law requires a
        warranty, it is limited to 90 days from first use. Nothing here excludes
        liability for death, personal injury, fraud, or anything else the law
        does not allow to be excluded.
      </p>

      <h2>15. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect,
        incidental, special, consequential, or punitive damages, or for lost
        profits, revenue, or data, arising out of or related to the Service. Our
        total aggregate liability in any twelve-month period is limited to the
        greater of the amount you paid us for the Service in that period, or INR
        10,000.
      </p>
      <p>
        Nothing in these Terms excludes liability that cannot lawfully be
        excluded, including liability for fraud or wilful misconduct.
      </p>

      <h2>16. Indemnity</h2>
      <p>
        You agree to defend and indemnify SophionOS and its contributors against
        claims, and reasonable costs and attorneys&apos; fees, arising from your
        violation of these Terms, your violation of any law, or content you
        submit that infringes a third party&apos;s rights. We may take over the
        defense of any such claim at your expense, and you agree not to settle
        one without our written consent.
      </p>

      <h2>17. Dispute resolution and arbitration</h2>
      <p>
        <strong>
          Please read this section carefully. It affects your legal rights,
          including your right to sue in court and your right to a jury trial.
        </strong>
      </p>
      <ul>
        <li>
          <strong>Try to resolve it first.</strong> Before starting arbitration,
          write to <strong>founders@sophionos.com</strong> with a description of
          the dispute and the relief you want. We will do the same if we have a
          dispute with you. If we have not resolved it within 60 days, either of
          us may start arbitration.
        </li>
        <li>
          <strong>Agreement to arbitrate.</strong> Except as stated below, you
          and SophionOS agree to resolve every dispute arising out of or relating
          to the Service or these Terms through binding individual arbitration,
          and not in court. The arbitration is administered under the rules of a
          recognised arbitration provider we agree with you in writing; if we
          cannot agree, under the American Arbitration
          Association&apos;s Consumer Arbitration Rules for consumer disputes.
          The seat of arbitration is the county where you live, unless we both
          agree otherwise.
        </li>
        <li>
          <strong>Exceptions.</strong> Either of us may bring an individual
          claim in small-claims court if it qualifies, and either of us may seek
          injunctive or other equitable relief in court to protect intellectual
          property rights.
        </li>
        <li>
          <strong>Purchase disputes are not ours.</strong> Except for a billing
          error or duplicate charge, which is handled under section 11, a
          dispute about a charge, a refund, a tax, or the cancellation of a
          purchase is a dispute with Dodo Payments under its terms of sale. It
          is not covered by this section, and nothing here changes which
          contract you have with Dodo Payments.
        </li>
        <li>
          <strong>Your statutory rights are unaffected.</strong> Nothing in this
          section prevents you from bringing a matter to a consumer redressal
          forum, the Data Protection Board, or any other authority or regulator
          as the law allows, and nothing here excludes liability that cannot
          lawfully be excluded.
        </li>
        <li>
          <strong>Waiver of class actions.</strong> All disputes must be brought
          on an individual basis. Neither you nor SophionOS may bring a claim as
          a plaintiff or class member in any class, representative, or
          collective proceeding. The arbitrator may award relief only on an
          individual basis.
        </li>
        <li>
          <strong>Waiver of jury trial.</strong> By agreeing to arbitration, you
          and SophionOS waive the right to a trial by judge or jury for all
          covered claims.
        </li>
        <li>
          <strong>Opt out.</strong> You may opt out of this arbitration
          agreement within 30 days of first accepting these Terms by emailing{" "}
          <strong>founders@sophionos.com</strong> with the subject line
          &quot;arbitration opt-out&quot;. If you opt out, disputes proceed in
          accordance with section 20, and this section does not apply to you.
        </li>
      </ul>

      <h2>18. Changes to these terms</h2>
      <p>
        We may revise these Terms. A revision is published as a new version at{" "}
        <a href="/terms">the Terms page</a> with its own version number and
        effective date.
      </p>
      <p>
        When we publish a version that changes these terms materially, users on
        an older version are shown a notice asking them to review and accept the
        new version before continuing to use the Service. Your consent record for
        each version is kept, so you can see exactly which version you accepted
        and when.
      </p>
      <p>
        Continuing to use the Service after the effective date of a revised
        version means you accept it. Continued use of an older accepted version
        is not permitted where the change is required by law or to address a
        security risk. The version in force when you accepted the Terms governs
        the period before that.
      </p>
      <p>
        If a signed Cloud order or enterprise agreement conflicts with this page,
        the signed agreement controls.
      </p>

      <h2>19. Children&apos;s data</h2>
      <p>
        The Service is not directed at children and is not intended for use by
        anyone under 18. We do not knowingly collect data from children under
        18. See the <a href="/privacy">Privacy Policy</a> for the full statement
        and what to do if you believe a child has used the Service.
      </p>

      <h2>20. Governing law and general</h2>
      <p>
        These Terms are governed by the laws of India. The courts at Bengaluru,
        Karnataka have exclusive jurisdiction, subject to any mandatory consumer
        redressal forum or statutory right that applies to you notwithstanding.
        Where arbitration does not apply, each of us consents to the exclusive
        jurisdiction of those courts, and either of us may use any court with
        jurisdiction for equitable relief.
      </p>
      <p>
        The purchase of a paid plan or a Founding Cohort seat is a separate
        contract with Dodo Payments, governed by the law and forum stated in Dodo
        Payments&apos; terms of sale.
      </p>
      <p>
        Nothing in these Terms limits your right to approach the Data Protection
        Board or any other authority or consumer forum as the law allows.
      </p>
      <ul>
        <li>
          <strong>Export.</strong> You agree not to export or re-export anything
          from the Service in violation of applicable export-control law,
          including U.S. export controls and applicable Indian export law.
        </li>
        <li>
          <strong>Assignment.</strong> You cannot assign these Terms without our
          written consent. We may assign them in connection with a merger,
          acquisition, or sale of assets, and will notify you if we do.
        </li>
        <li>
          <strong>Entire agreement; severability.</strong> These Terms, together
          with the Privacy Policy and any signed order, are the entire agreement
          between us about the Service. If a provision is unenforceable, it will
          be limited to the minimum extent necessary and the rest stays in
          effect. Our failure to enforce a provision is not a waiver.
        </li>
        <li>
          <strong>Copyright.</strong> © 2026 SophionOS. All rights reserved.
        </li>
      </ul>

      <h2>21. Contact</h2>
      <p>
        Questions about these Terms, and about the Service itself, addressed to
        Taha Aalam (sole proprietor, trading as SophionOS):{" "}
        <strong>privacy@sophionos.com</strong>.
      </p>
      <p>
        Questions about a purchase — a charge, an invoice, a tax, a refund, or
        cancelling a subscription — go to Dodo Payments, which sells to you as
        merchant of record. Use the customer portal reachable from Settings →
        Billing, or the contact details on your invoice. The exception is a
        billing error or duplicate charge: write to{" "}
        <strong>founders@sophionos.com</strong> as section 11 sets out, and we
        will refund the erroneous charge.
      </p>
      <p>
        Grievances about these Terms are handled through the process and the
        officer named in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <p className="text-sm text-muted-foreground">
        <strong>Status: DRAFT.</strong> This document requires review by
        qualified Indian counsel before it is published as binding.
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
