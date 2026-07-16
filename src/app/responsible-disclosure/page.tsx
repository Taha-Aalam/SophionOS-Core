import { TrustPageShell } from "@/components/trust/trust-page-shell";

export const metadata = {
  title: "Responsible disclosure | SophionOS",
  description: "How to report security vulnerabilities.",
};

export default function ResponsibleDisclosurePage() {
  return (
    <TrustPageShell title="Responsible disclosure">
      <p>
        If you believe you have found a security vulnerability in SophionOS,
        please report it privately so we can investigate before public
        disclosure.
      </p>
      <h2>How to report</h2>
      <ul>
        <li>
          Email the security contact listed in <code>SECURITY.md</code> in the
          repository (or the operator contact for Sophion Cloud).
        </li>
        <li>
          Include steps to reproduce, impact assessment, and whether any user
          data was accessed.
        </li>
        <li>Do not include raw API keys or session tokens in tickets if avoidable.</li>
      </ul>
      <h2>What to expect</h2>
      <p>
        We aim to acknowledge reports promptly, investigate, and remediate
        according to severity. Please allow reasonable time before public
        disclosure.
      </p>
    </TrustPageShell>
  );
}
