import { PolicyMeta } from "@/components/trust/policy-meta";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Subprocessors | SophionOS",
  description: "Vendors that may process SophionOS data.",
};

export default function SubprocessorsPage() {
  return (
    <TrustPage
      emoji="🏢"
      title="Subprocessors"
      description="Vendors that may process SophionOS data."
    >
      <PolicyMeta
        version="2.1"
        effective="October 19, 2026"
        summary="Replaces the previous vendor list. Names the actual vendors now in use — Dodo Payments for subscription billing and the one-time founding-seat checkout, and Resend for transactional email — and separates what the Cloud service uses from what a self-hosted deployment uses."
      />

      <p>
        Under India&apos;s DPDP Act, 2023 Taha Aalam, sole proprietor trading as
        SophionOS, is the Data Fiduciary and these vendors are our Data
        Processors; where the EU or UK GDPR applies, we are the controller and
        they are our processors. Each is bound by contract to process personal
        data only on our instructions and to apply security safeguards. This
        page lists who they are and why.
      </p>
      <p>
        Dodo Payments is the exception. It is our merchant of record and the
        seller of record for paid plans and founding seats, so it decides how
        your payment data is processed rather than processing it on our
        instructions, and Dodo&apos;s own{" "}
        <a href="https://dodopayments.com/privacy-policy">privacy policy</a>{" "}
        applies to that data. See section 4.1 of the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>SophionOS Cloud</h2>
      <table>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Purpose</th>
            <th>Data involved</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Clerk</td>
            <td>Authentication, sessions, account identity</td>
            <td>Email, name, profile image, user id, session records</td>
            <td>United States</td>
          </tr>
          <tr>
            <td>Supabase</td>
            <td>Database and hosting</td>
            <td>
              Your workspace content, settings, hashed API keys, billing
              metadata
            </td>
            <td>United States</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Application hosting and delivery</td>
            <td>Request data and logs in transit</td>
            <td>United States / global edge</td>
          </tr>
          <tr>
            <td>Dodo Payments</td>
            <td>
              Subscription billing and the one-time founding-seat checkout;
              merchant of record — the seller of record, not a processor
            </td>
            <td>
              Your name, email, and billing details at checkout, and the
              payment record. Card details go to Dodo, never to us.
            </td>
            <td>United States / India</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Transactional email delivery</td>
            <td>
              Your email address and the content of the brief or notice being
              delivered
            </td>
            <td>United States</td>
          </tr>
          <tr>
            <td>Cron and job infrastructure</td>
            <td>Scheduling of briefs and background jobs</td>
            <td>Job payloads, which may include workspace identifiers</td>
            <td>United States</td>
          </tr>
        </tbody>
      </table>

      <h2>AI clients you connect</h2>
      <p>
        Anthropic (Claude), OpenAI (Codex), Cursor, Antigravity, OpenCode, and
        other MCP-compatible clients are <strong>not</strong> our processors.
        They are independent controllers acting for you. SophionOS does not call
        them; you configure them with an API key you create, and they process
        whatever they read under their own terms. We cannot instruct them,
        audit them, or delete data from them. See{" "}
        <a href="/data-and-ai">Data &amp; AI</a>.
      </p>

      <h2>Self-hosted SophionOS Core</h2>
      <p>
        If you self-host, <strong>you</strong> choose the processors. This page
        lists our choices, not yours. A self-hosted deployment typically uses:
      </p>
      <ul>
        <li>
          <strong>Your own Clerk application</strong> (or your identity
          provider of choice) for authentication.
        </li>
        <li>
          <strong>Your own Supabase/Postgres instance</strong> and your own
          hosting, in whatever region you configure.
        </li>
        <li>
          <strong>Your own email provider</strong> if you enable briefs.
        </li>
        <li>
          <strong>Any AI client your users connect.</strong>
        </li>
      </ul>
      <p>
        Billing, Dodo Payments, and the SophionOS-managed Supabase and Vercel
        projects do not apply to your deployment.
      </p>

      <h2>Changes to this list</h2>
      <p>
        We add a vendor only when a feature needs it, and we update this page at
        the same time. If a change materially affects how your personal data is
        processed, we tell you by email before it takes effect, and you may
        object or delete your account first. To be notified of changes, or to
        raise an objection, write to{" "}
        <a href="mailto:privacy@sophionos.com">privacy@sophionos.com</a>.
      </p>
      <p className="text-sm text-muted-foreground">
        This page is product documentation, not legal counsel.
      </p>
      <p>
        Related: <a href="/privacy">Privacy</a> ·{" "}
        <a href="/security">Security</a> · <a href="/terms">Terms</a>
      </p>
    </TrustPage>
  );
}
