import { PolicyMeta } from "@/components/trust/policy-meta";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Responsible disclosure | SophionOS",
  description: "How to report security vulnerabilities.",
};

export default function ResponsibleDisclosurePage() {
  return (
    <TrustPage
      emoji="🐛"
      title="Responsible Disclosure"
      description="How to report security vulnerabilities."
    >
      <PolicyMeta
        version="2.1"
        effective="October 19, 2026"
        summary="Replaces the previous page. Adds safe-harbor terms, a clear scope of what is and is not in bounds, and the timelines you can expect."
      />

      <p>
        If you believe you have found a security vulnerability in SophionOS,
        please report it privately so we can investigate before public
        disclosure. Good-faith research is welcome, and we will not pursue or
        support legal action against you for it.
      </p>

      <h2>How to report</h2>
      <ul>
        <li>
          Email{" "}
          <a href="mailto:security@sophionos.com">security@sophionos.com</a>{" "}
          with the subject line &quot;Security&quot;. This is the security
          contact for SophionOS Cloud, and the same address the
          repository&apos;s <code>SECURITY.md</code> names. For a self-hosted
          deployment, contact its operator instead.
        </li>
        <li>
          Include steps to reproduce, the impact you believe it has, and whether
          any user data was accessed or could be.
        </li>
        <li>
          Do not include raw API keys, passwords, or session tokens; redact
          anything sensitive. If a secret leaked, tell us so we can rotate it —
          do not send the secret itself.
        </li>
      </ul>

      <h2>Safe harbor</h2>
      <p>
        If you act in good faith and follow this page, we consider your research
        authorized, and we will not bring or support a legal claim against you
        for it. Good faith means:
      </p>
      <ul>
        <li>
          You test only against your own account and your own data, or a test
          account you created for the purpose.
        </li>
        <li>
          You stop as soon as you have enough evidence to demonstrate the issue,
          and you do not exfiltrate, retain, or share anyone else&apos;s data.
        </li>
        <li>
          You do not degrade, interrupt, or deny service to other users, and you
          do not run automated load, brute-force, or spam campaigns.
        </li>
        <li>
          You give us a reasonable opportunity to fix the issue before any
          public disclosure, and you do not disclose another person&apos;s data
          at any point.
        </li>
      </ul>
      <p>
        This safe harbor does not cover the systems of our providers — Clerk,
        Supabase, Vercel, Dodo Payments, or Resend. Report issues in those
        services to them, under their own programs.
      </p>

      <h2>In scope</h2>
      <ul>
        <li>
          Authentication and session handling on app.sophionos.com, including
          authorization bypass.
        </li>
        <li>
          Cross-user data access — any way to read or write another user&apos;s
          rows through the app, the REST API, or the MCP server.
        </li>
        <li>API key handling, and the plan and entitlement checks.</li>
        <li>Server-side request forgery, injection, and access-control flaws.</li>
        <li>Prompt-injection paths that cross a user boundary.</li>
      </ul>

      <h2>Out of scope</h2>
      <ul>
        <li>
          Findings that require a compromised device, a compromised browser
          extension, or physical access.
        </li>
        <li>
          Missing security headers with no demonstrated impact, clickjacking on
          pages with no sensitive action, and self-XSS.
        </li>
        <li>
          Reports from automated scanners with no proof of impact, and
          rate-limit or email-bombing reports that are working as designed.
        </li>
        <li>
          Social engineering of the founder or any user, and physical attacks.
        </li>
        <li>
          Denial of service, load testing, or anything that degrades the service
          for others.
        </li>
        <li>
          Third-party services listed in{" "}
          <a href="/subprocessors">Subprocessors</a> — report to them.
        </li>
      </ul>

      <h2>What to expect</h2>
      <p>
        We acknowledge reports within 7 days, tell you whether we consider the
        issue in scope, and keep you informed of progress. We aim to remediate
        critical issues within 30 days and lower-severity issues within 90 days,
        and we will tell you if a fix will take longer. Where the law requires us
        to notify a regulator or affected users — see the Privacy Policy — we
        handle that, not the reporter. We are happy to credit you in the fix
        notes or in the repository if you would like; just say so.
      </p>
      <p className="text-sm text-muted-foreground">
        This page is product documentation, not legal counsel.
      </p>
      <p>
        Related: <a href="/security">Security</a> ·{" "}
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
      </p>
    </TrustPage>
  );
}
