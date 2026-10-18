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
        version="2.0"
        effective="October 18, 2026"
        summary="Replaces the previous vendor list. Names the actual vendors now in use — Dodo Payments for founding seats and Resend for transactional email — and separates what the Cloud service uses from what a self-hosted deployment uses."
      />

      <p>
        Under the EU and UK GDPR we are the controller and these vendors are our
        processors. Under India&apos;s DPDP Act, 2023 we are the Data Fiduciary
        and they are our Data Processors. Each is bound by contract to process
        personal data only on our instructions and to apply security
        safeguards. This page lists who they are and why.
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
              Payment processing for Founding Cohort seats; merchant of record
            </td>
            <td>
              Your email and name at checkout, and the payment record. Card
              details go to Dodo, never to us.
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
        Anthropic (Claude), OpenAI (Codex), Cursor, and other MCP-compatible
        clients are <strong>not</strong> our processors. They are independent
        controllers acting for you. SophionOS does not call them; you configure
        them with an API key you create, and they process whatever they read
        under their own terms. We cannot instruct them, audit them, or delete
        data from them. See <a href="/data-and-ai">Data &amp; AI</a>.
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
        <a href="mailto:founders@sophionos.com">founders@sophionos.com</a>.
      </p>
      <p>
        Related: <a href="/privacy">Privacy</a> ·{" "}
        <a href="/security">Security</a> · <a href="/terms">Terms</a>
      </p>
    </TrustPage>
  );
}
